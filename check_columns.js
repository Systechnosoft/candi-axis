const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'ca-api', 'src', 'database', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'));

const tableColumns = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const createTableRegex = /CREATE TABLE IF NOT EXISTS (?:public\.)?([a-z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const columnsText = match[2];
    if (!tableColumns[tableName]) {
      tableColumns[tableName] = { updated_at: false, updated_by: false };
    }
    if (columnsText.includes('"updated_at"')) tableColumns[tableName].updated_at = true;
    if (columnsText.includes('"updated_by"')) tableColumns[tableName].updated_by = true;
  }
  
  // also check for ALTER TABLE ... ADD COLUMN
  const alterTableRegex = /ALTER TABLE (?:ONLY )?(?:public\.)?([a-z0-9_]+) ADD COLUMN IF NOT EXISTS "([a-z0-9_]+)"/gi;
  while ((match = alterTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const colName = match[2];
    if (tableColumns[tableName]) {
      if (colName === 'updated_at') tableColumns[tableName].updated_at = true;
      if (colName === 'updated_by') tableColumns[tableName].updated_by = true;
    }
  }
});

const missing = {
  updated_at: [],
  updated_by: []
};

for (const [table, cols] of Object.entries(tableColumns)) {
  if (!cols.updated_at) missing.updated_at.push(table);
  if (!cols.updated_by) missing.updated_by.push(table);
}

console.log(JSON.stringify(missing, null, 2));
