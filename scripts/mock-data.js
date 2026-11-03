const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envVars = {};
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          envVars[key] = val;
        }
      }
    } catch (e) {
      console.warn('Warning: Could not read .env file:', e.message);
    }
  }
  return envVars;
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || 'https://klcbypzapfojjakoehgx.supabase.co';
const SUPABASE_KEY = env.SUPABASE_ANON_KEY || 'sb_publishable_hg4IZNmibddbNsxe5t0aZQ_1XUUBxBp';

// Low-level Supabase REST API helper
function apiRequest(endpoint, method = 'GET', data = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(endpoint.startsWith('http') ? endpoint : `${SUPABASE_URL}/rest/v1/${endpoint.replace(/^\//, '')}`);
    const client = fullUrl.protocol === 'https:' ? https : http;

    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...extraHeaders
    };

    let postData = null;
    if (data !== null) {
      postData = typeof data === 'string' ? data : JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      method: method,
      headers: headers
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          if (body && body.trim()) json = JSON.parse(body);
        } catch (_) {
          json = body;
        }
        if (res.statusCode >= 400) {
          console.error(`❌ API Error ${res.statusCode} on ${endpoint}:`, json || body);
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: body
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Add at least 1 mock data for every field / subject ONLY if data is not available
async function addMockData() {
  console.log('🚀 Checking data availability across every subject and field...\n');

  // 1. Fetch canonical syllabus Unit 01 for all subjects
  const sylRes = await apiRequest('canonical_syllabus?unit_number=eq.1&order=sort_order.asc', 'GET');
  const unit1List = Array.isArray(sylRes.body) ? sylRes.body : [];
  if (unit1List.length === 0) {
    throw new Error('canonical_syllabus has no unit 1 rows! Please run schema_grade9_complete.sql first.');
  }

  // Also fetch Unit 02 for MATH and SCI (for Urgent Radar demo)
  const syl2Res = await apiRequest('canonical_syllabus?unit_number=eq.2&subject=in.(MATH,SCI)', 'GET');
  const unit2List = Array.isArray(syl2Res.body) ? syl2Res.body : [];

  // 2. Fetch existing data across all tables to identify what is already available
  const [upRes, fpRes, srRes, ssRes, tpRes, regRes] = await Promise.all([
    apiRequest('unit_papers?select=id,subject,syllabus_id', 'GET'),
    apiRequest('full_papers?time_taken=not.like.APP_CONFIG_*&select=id,subject,remarks', 'GET'),
    apiRequest('spaced_repetition_log?select=id,subject,syllabus_id', 'GET'),
    apiRequest('study_timer_sessions?select=id,subject,unit_name', 'GET'),
    apiRequest('tracker_progress?select=id,syllabus_id,subject,lesson_done,hw_done', 'GET'),
    apiRequest('full_papers?time_taken=eq.APP_CONFIG_MOCK_REGISTRY&limit=1', 'GET')
  ]);

  const existingUP = Array.isArray(upRes.body) ? upRes.body : [];
  const existingFP = Array.isArray(fpRes.body) ? fpRes.body : [];
  const existingSR = Array.isArray(srRes.body) ? srRes.body : [];
  const existingSS = Array.isArray(ssRes.body) ? ssRes.body : [];
  const existingTP = Array.isArray(tpRes.body) ? tpRes.body : [];

  // Load or initialize mock registry
  let mockRegistry = {
    unit_paper_ids: [],
    full_paper_ids: [],
    sr_log_ids: [],
    session_ids: [],
    tracker_syl_ids: []
  };
  if (Array.isArray(regRes.body) && regRes.body.length > 0) {
    try {
      mockRegistry = JSON.parse(regRes.body[0].remarks);
    } catch (_) {}
  }

  // Helper date generators
  const now = new Date();
  const getDaysAgoIso = (daysAgo, hour = 10, minute = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute, 0);
    return d.toISOString();
  };
  const getDaysAgoDateStr = (daysAgo) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Realistic mock configurations
  const subjectScores = {
    MATH: { unitMarks: 88, examMarks: 85, durationMin: 55 },
    SCI:  { unitMarks: 92, examMarks: 90, durationMin: 60 },
    SIN:  { unitMarks: 80, examMarks: 82, durationMin: 45 },
    ENG:  { unitMarks: 85, examMarks: 88, durationMin: 40 },
    BUD:  { unitMarks: 95, examMarks: 94, durationMin: 35 },
    HIST: { unitMarks: 78, examMarks: 76, durationMin: 50 },
    GEO:  { unitMarks: 84, examMarks: 80, durationMin: 45 },
    CIV:  { unitMarks: 86, examMarks: 85, durationMin: 30 },
    HLTH: { unitMarks: 90, examMarks: 88, durationMin: 30 },
    ICT:  { unitMarks: 94, examMarks: 92, durationMin: 60 },
    TAM:  { unitMarks: 75, examMarks: 74, durationMin: 40 },
    AES:  { unitMarks: 88, examMarks: 86, durationMin: 45 },
    PTS:  { unitMarks: 82, examMarks: 80, durationMin: 40 }
  };

  let addedSessionsCount = 0;
  let addedUnitPapersCount = 0;
  let addedFullPapersCount = 0;
  let addedSRLogsCount = 0;
  let updatedTrackerCount = 0;

  // --- Field 1: Study Timer Sessions ---
  console.log('📊 [1/5] Checking Study Timer Sessions...');
  const newSessions = [];
  unit1List.forEach((syl, idx) => {
    const subj = syl.subject;
    // Check if session data already exists for this subject
    const hasData = existingSS.some(s => s.subject === subj);
    if (!hasData) {
      const cfg = subjectScores[subj] || { durationMin: 45 };
      const daysAgo = idx % 7;
      const startHour = 8 + (idx % 10);
      const startMin = (idx * 5) % 60;
      const startDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, startHour, startMin, 0);
      const endDateTime = new Date(startDateTime.getTime() + cfg.durationMin * 60000);

      const startDateStr = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}`;
      const startTimeStr = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}:00`;
      const endDateStr = `${endDateTime.getFullYear()}-${String(endDateTime.getMonth() + 1).padStart(2, '0')}-${String(endDateTime.getDate()).padStart(2, '0')}`;
      const endTimeStr = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}:00`;

      newSessions.push({
        subject: subj,
        unit_number: 1,
        unit_name: `[MOCK] ${syl.unit_name || syl.sub_lesson_title || 'Unit 01'}`,
        timer_start_date: startDateStr,
        timer_start_time: startTimeStr,
        timer_stop_date: endDateStr,
        timer_stop_time: endTimeStr,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_minutes: cfg.durationMin,
        duration_seconds: cfg.durationMin * 60,
        status: 'completed',
        session_date: startDateStr
      });
    } else {
      console.log(`   ℹ️  ${subj}: Study session already available, skipped.`);
    }
  });

  if (newSessions.length > 0) {
    const res = await apiRequest('study_timer_sessions', 'POST', newSessions, { 'Prefer': 'return=representation' });
    if (Array.isArray(res.body)) {
      res.body.forEach(r => mockRegistry.session_ids.push(r.id));
      addedSessionsCount = res.body.length;
      console.log(`   ✓ Added ${addedSessionsCount} mock study timer session(s).`);
    }
  } else {
    console.log('   ✓ Study timer sessions already complete for all subjects.');
  }

  // --- Field 2: Unit Papers ---
  console.log('\n📝 [2/5] Checking Unit Practice Papers...');
  const newUnitPapers = [];
  unit1List.forEach((syl, idx) => {
    const subj = syl.subject;
    const hasData = existingUP.some(p => p.subject === subj);
    if (!hasData) {
      const cfg = subjectScores[subj] || { unitMarks: 85 };
      newUnitPapers.push({
        syllabus_id: syl.id,
        subject: subj,
        sub_lesson_code: syl.sub_lesson_code || 'Unit 01',
        paper_no: 1,
        marks: cfg.unitMarks,
        logged_at: getDaysAgoIso(3 + (idx % 5))
      });
    } else {
      console.log(`   ℹ️  ${subj}: Unit paper already available, skipped.`);
    }
  });

  if (newUnitPapers.length > 0) {
    const res = await apiRequest('unit_papers', 'POST', newUnitPapers, { 'Prefer': 'return=representation' });
    if (Array.isArray(res.body)) {
      res.body.forEach(r => mockRegistry.unit_paper_ids.push(r.id));
      addedUnitPapersCount = res.body.length;
      console.log(`   ✓ Added ${addedUnitPapersCount} mock unit practice paper(s).`);
    }
  } else {
    console.log('   ✓ Unit papers already complete for all subjects.');
  }

  // --- Field 3: Full Term Exam Papers ---
  console.log('\n🏆 [3/5] Checking Full Term Test Papers...');
  const newFullPapers = [];
  unit1List.forEach((syl, idx) => {
    const subj = syl.subject;
    const hasData = existingFP.some(p => p.subject === subj);
    if (!hasData) {
      const cfg = subjectScores[subj] || { examMarks: 80 };
      newFullPapers.push({
        subject: subj,
        exam_date: getDaysAgoDateStr(14 + (idx % 3)),
        marks: cfg.examMarks,
        time_taken: '2h 00m',
        remarks: `[MOCK_DATA] 1st Term Examination 2026 - ${subj}`,
        logged_at: getDaysAgoIso(14 + (idx % 3))
      });
    } else {
      console.log(`   ℹ️  ${subj}: Full paper already available, skipped.`);
    }
  });

  if (newFullPapers.length > 0) {
    const res = await apiRequest('full_papers', 'POST', newFullPapers, { 'Prefer': 'return=representation' });
    if (Array.isArray(res.body)) {
      res.body.forEach(r => mockRegistry.full_paper_ids.push(r.id));
      addedFullPapersCount = res.body.length;
      console.log(`   ✓ Added ${addedFullPapersCount} mock full term paper(s).`);
    }
  } else {
    console.log('   ✓ Full term test papers already complete for all subjects.');
  }

  // --- Field 4: Spaced Repetition Logs ---
  console.log('\n🧠 [4/5] Checking Spaced Repetition Logs...');
  const newSRLogs = [];
  unit1List.forEach((syl, idx) => {
    const subj = syl.subject;
    const hasData = existingSR.some(sr => sr.subject === subj);
    if (!hasData) {
      newSRLogs.push({
        syllabus_id: syl.id,
        subject: subj,
        sub_lesson_code: syl.sub_lesson_code || 'Unit 01',
        day_stage: idx % 2 === 0 ? 3 : 1,
        cycle: 1,
        completed_at: getDaysAgoIso(2 + (idx % 4))
      });
    } else {
      console.log(`   ℹ️  ${subj}: Spaced repetition log already available, skipped.`);
    }
  });

  if (newSRLogs.length > 0) {
    const res = await apiRequest('spaced_repetition_log', 'POST', newSRLogs, { 'Prefer': 'return=representation' });
    if (Array.isArray(res.body)) {
      res.body.forEach(r => mockRegistry.sr_log_ids.push(r.id));
      addedSRLogsCount = res.body.length;
      console.log(`   ✓ Added ${addedSRLogsCount} mock spaced repetition log(s).`);
    }
  } else {
    console.log('   ✓ Spaced repetition logs already complete for all subjects.');
  }

  // --- Field 5: Tracker Progress (Lessons / Homework Done) ---
  console.log('\n🎯 [5/5] Checking Tracker Progress (Lesson/Homework completion)...');
  const tpMap = new Map();
  existingTP.forEach(t => tpMap.set(t.syllabus_id, t));

  for (const syl of unit1List) {
    const curr = tpMap.get(syl.id);
    const isAvailable = curr && (curr.lesson_done === true || curr.hw_done === true);
    if (!isAvailable) {
      // Mark as mock progress and record in registry for clean deletion
      if (!mockRegistry.tracker_syl_ids.includes(syl.id)) {
        mockRegistry.tracker_syl_ids.push(syl.id);
      }
      await apiRequest(`tracker_progress?syllabus_id=eq.${syl.id}`, 'PATCH', {
        lesson_done: true,
        lesson_done_at: getDaysAgoIso(20),
        lesson_days: 20,
        hw_done: true,
        hw_done_at: getDaysAgoIso(16),
        hw_days: 16,
        papers_done_count: 1,
        paper_days: 3,
        updated_at: new Date().toISOString()
      });
      updatedTrackerCount++;
    } else {
      console.log(`   ℹ️  ${syl.subject} Unit 01: User lesson/HW already done, left untouched.`);
    }
  }

  // Populate Unit 02 for MATH and SCI to show pending papers in Urgent Radar
  for (const syl2 of unit2List) {
    const curr = tpMap.get(syl2.id);
    const isAvailable = curr && (curr.lesson_done === true || curr.hw_done === true);
    if (!isAvailable) {
      if (!mockRegistry.tracker_syl_ids.includes(syl2.id)) {
        mockRegistry.tracker_syl_ids.push(syl2.id);
      }
      await apiRequest(`tracker_progress?syllabus_id=eq.${syl2.id}`, 'PATCH', {
        lesson_done: true,
        lesson_done_at: getDaysAgoIso(10),
        lesson_days: 10,
        hw_done: true,
        hw_done_at: getDaysAgoIso(8),
        hw_days: 8,
        papers_done_count: 0,
        paper_days: 8,
        updated_at: new Date().toISOString()
      });
      updatedTrackerCount++;
    }
  }
  console.log(`   ✓ Updated mock tracker progress for ${updatedTrackerCount} unit(s).`);

  // --- Save Mock Registry for One-Command Deletion ---
  console.log('\n🔒 Updating mock metadata registry for one-command deletion...');
  await apiRequest('full_papers?time_taken=eq.APP_CONFIG_MOCK_REGISTRY', 'DELETE');
  await apiRequest('full_papers', 'POST', [{
    subject: 'MATH',
    marks: 0,
    time_taken: 'APP_CONFIG_MOCK_REGISTRY',
    remarks: JSON.stringify(mockRegistry),
    logged_at: new Date().toISOString()
  }]);

  console.log('\n================================================================');
  console.log('🎉 COMPLETED: Mock data successfully verified & populated!');
  console.log('================================================================');
  console.log(`   - New Study Timer Sessions: ${addedSessionsCount}`);
  console.log(`   - New Unit Practice Papers: ${addedUnitPapersCount}`);
  console.log(`   - New Full Term Papers:     ${addedFullPapersCount}`);
  console.log(`   - New Spaced Repetition:    ${addedSRLogsCount}`);
  console.log(`   - New Tracker Units Active: ${updatedTrackerCount}`);
  console.log('----------------------------------------------------------------');
  console.log('💡 TO DELETE ALL MOCK DATA IN ONE COMMAND, RUN:');
  console.log('   npm run mock:delete');
  console.log('   (or: node scripts/mock-data.js delete)');
  console.log('================================================================\n');

  return {
    success: true,
    added: {
      sessions: addedSessionsCount,
      unitPapers: addedUnitPapersCount,
      fullPapers: addedFullPapersCount,
      srLogs: addedSRLogsCount,
      trackerUnits: updatedTrackerCount
    }
  };
}

// Delete ALL mock data in ONE command
async function deleteMockData() {
  console.log('🗑️  Deleting all mock data across all tables in one command...\n');

  // Try to load registry
  const regRes = await apiRequest('full_papers?time_taken=eq.APP_CONFIG_MOCK_REGISTRY&limit=1', 'GET');
  let registry = null;
  if (Array.isArray(regRes.body) && regRes.body.length > 0) {
    try {
      registry = JSON.parse(regRes.body[0].remarks);
    } catch (_) {}
  }

  let deletedUnitPapers = 0;
  let deletedSrLogs = 0;
  let deletedSessions = 0;
  let deletedFullPapers = 0;
  let resetTrackerUnits = 0;

  // 1. Delete Unit Papers
  if (registry && registry.unit_paper_ids && registry.unit_paper_ids.length > 0) {
    const idList = registry.unit_paper_ids.join(',');
    await apiRequest(`unit_papers?id=in.(${idList})`, 'DELETE');
    deletedUnitPapers = registry.unit_paper_ids.length;
  }

  // 2. Delete Spaced Repetition Logs
  if (registry && registry.sr_log_ids && registry.sr_log_ids.length > 0) {
    const idList = registry.sr_log_ids.join(',');
    await apiRequest(`spaced_repetition_log?id=in.(${idList})`, 'DELETE');
    deletedSrLogs = registry.sr_log_ids.length;
  }

  // 3. Delete Study Timer Sessions (by registry IDs or by [MOCK] tag)
  if (registry && registry.session_ids && registry.session_ids.length > 0) {
    const idList = registry.session_ids.join(',');
    await apiRequest(`study_timer_sessions?id=in.(${idList})`, 'DELETE');
    deletedSessions = registry.session_ids.length;
  }
  await apiRequest('study_timer_sessions?unit_name=like.*[MOCK]*', 'DELETE');

  // 4. Delete Full Papers (by registry IDs or by [MOCK_DATA] tag)
  if (registry && registry.full_paper_ids && registry.full_paper_ids.length > 0) {
    const idList = registry.full_paper_ids.join(',');
    await apiRequest(`full_papers?id=in.(${idList})`, 'DELETE');
    deletedFullPapers = registry.full_paper_ids.length;
  }
  await apiRequest('full_papers?remarks=like.*[MOCK_DATA]*', 'DELETE');

  // 5. Reset Tracker Progress for mock-tagged units back to uncompleted
  if (registry && registry.tracker_syl_ids && registry.tracker_syl_ids.length > 0) {
    for (const sylId of registry.tracker_syl_ids) {
      await apiRequest(`tracker_progress?syllabus_id=eq.${sylId}`, 'PATCH', {
        lesson_done: false,
        lesson_done_at: null,
        lesson_days: 0,
        hw_done: false,
        hw_done_at: null,
        hw_days: 0,
        papers_done_count: 0,
        paper_days: 0,
        updated_at: new Date().toISOString()
      });
      resetTrackerUnits++;
    }
  }

  // 6. Delete the registry row itself
  await apiRequest('full_papers?time_taken=eq.APP_CONFIG_MOCK_REGISTRY', 'DELETE');

  console.log('✅ ALL mock data has been completely wiped:');
  console.log(`   - Deleted ${deletedUnitPapers} unit practice papers`);
  console.log(`   - Deleted ${deletedSrLogs} spaced repetition logs`);
  console.log(`   - Deleted ${deletedSessions} study timer sessions`);
  console.log(`   - Deleted ${deletedFullPapers} full term papers`);
  console.log(`   - Reset ${resetTrackerUnits} syllabus tracker units back to uncompleted`);
  console.log('\n✨ Database is clean and ready for real study data!\n');

  return {
    deletedUnitPapers,
    deletedSrLogs,
    deletedSessions,
    deletedFullPapers,
    resetTrackerUnits
  };
}

// Status Check
async function statusMockData() {
  console.log('🔍 Checking database status...\n');
  const regRes = await apiRequest('full_papers?time_taken=eq.APP_CONFIG_MOCK_REGISTRY&limit=1', 'GET');
  const hasMockRegistry = Array.isArray(regRes.body) && regRes.body.length > 0;

  const upRes = await apiRequest('unit_papers?select=count', 'GET', null, { 'Prefer': 'count=exact' });
  const fpRes = await apiRequest('full_papers?time_taken=not.like.APP_CONFIG_*&select=count', 'GET', null, { 'Prefer': 'count=exact' });
  const srRes = await apiRequest('spaced_repetition_log?select=count', 'GET', null, { 'Prefer': 'count=exact' });
  const ssRes = await apiRequest('study_timer_sessions?select=count', 'GET', null, { 'Prefer': 'count=exact' });

  console.log('📊 Current Database Status:');
  console.log(`   - Mock Data Registry Active: ${hasMockRegistry ? 'YES' : 'NO'}`);
  console.log(`   - Unit Practice Papers:      ${upRes.headers['content-range'] || '0'}`);
  console.log(`   - Full Exam Papers:          ${fpRes.headers['content-range'] || '0'}`);
  console.log(`   - Spaced Repetition Logs:    ${srRes.headers['content-range'] || '0'}`);
  console.log(`   - Study Timer Sessions:      ${ssRes.headers['content-range'] || '0'}\n`);
}

// CLI Dispatcher
const command = (process.argv[2] || 'add').toLowerCase();

if (command === 'add' || command === 'seed') {
  addMockData().catch(err => {
    console.error('❌ Error adding mock data:', err);
    process.exit(1);
  });
} else if (command === 'delete' || command === 'clean' || command === 'remove') {
  deleteMockData().catch(err => {
    console.error('❌ Error deleting mock data:', err);
    process.exit(1);
  });
} else if (command === 'status' || command === 'check') {
  statusMockData().catch(err => {
    console.error('❌ Error checking status:', err);
    process.exit(1);
  });
} else {
  console.log(`Unknown command: ${command}`);
  console.log('Usage: node scripts/mock-data.js [add|delete|status]');
  process.exit(1);
}
