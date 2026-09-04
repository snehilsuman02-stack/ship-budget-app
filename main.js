const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let database;
let databasePromise;

async function getDatabase() {
    if (!databasePromise) {
        databasePromise = initSqlJs({ locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file) })
            .then((SQL) => {
                const databasePath = path.join(app.getPath('userData'), 'ssms.sqlite');
                database = new SQL.Database(fs.existsSync(databasePath) ? new Uint8Array(fs.readFileSync(databasePath)) : undefined);
                database.run(`
            CREATE TABLE IF NOT EXISTS app_data (
                table_name TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `);
                return database;
            });
    }
    return databasePromise;
}

async function persistDatabase() {
    const databasePath = path.join(app.getPath('userData'), 'ssms.sqlite');
    fs.writeFileSync(databasePath, Buffer.from((await getDatabase()).export()));
}

function validateTableName(tableName) {
    if (typeof tableName !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(tableName)) {
        throw new Error('Invalid SQLite table name.');
    }
    return tableName;
}

ipcMain.handle('sqlite:get', async (_event, tableName) => {
    const result = (await getDatabase()).exec('SELECT payload FROM app_data WHERE table_name = ?', [validateTableName(tableName)]);
    return result.length ? JSON.parse(result[0].values[0][0]) : null;
});

ipcMain.handle('sqlite:set', async (_event, tableName, value) => {
    const table = validateTableName(tableName);
    (await getDatabase()).run(`
        INSERT INTO app_data (table_name, payload, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(table_name) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `, [table, JSON.stringify(value), Date.now()]);
    await persistDatabase();
    return true;
});

ipcMain.handle('sqlite:remove', async (_event, tableName) => {
    (await getDatabase()).run('DELETE FROM app_data WHERE table_name = ?', [validateTableName(tableName)]);
    await persistDatabase();
    return true;
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});