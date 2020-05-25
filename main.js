const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: isDev ? 800 : 500,
		height: 600,
		title: 'ImageShrink',
		icon: './assets/icons/Icon_256x256.png',
		resizable: isDev ? true : false,
		webPreferences: {
			nodeIntegration: true,
		},
	});

	if (isDev) mainWindow.webContents.openDevTools();

	mainWindow.loadFile('./app/index.html');
}

function creatAboutWindow() {
	aboutWindow = new BrowserWindow({
		width: 300,
		height: 300,
		title: 'ImageShrink',
		icon: './assets/icons/Icon_256x256.png',
		resizable: isDev ? true : false,
	});

	aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
	createMainWindow();

	const mainMenu = Menu.buildFromTemplate(menu);
	Menu.setApplicationMenu(mainMenu);

	mainWindow.on('close', () => (mainWindow = null));
});

const menu = [
	...(isMac
		? [
				{
					label: app.name,
					submenu: [
						{
							label: 'About',
							click: () => creatAboutWindow(),
						},
					],
				},
		  ]
		: []),
	{ role: 'fileMenu' },
	...(!isMac
		? [
				{
					label: 'Help',
					submenu: [
						{
							label: 'About',
							click: () => creatAboutWindow(),
						},
					],
				},
		  ]
		: []),
	...(isDev
		? [
				{
					label: 'Developer',
					submenu: [{ role: 'reload' }, { role: 'forcereload' }, { type: 'separator' }, { role: 'toggledevtools' }],
				},
		  ]
		: []),
];

ipcMain.on('image:minimize', (e, options) => {
	options.dest = path.join(os.homedir(), 'imageshrink');
	shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
	try {
		const pngQuality = quality / 100;
		const files = await imagemin([slash(imgPath)], {
			destination: dest,
			plugins: [imageminMozjpeg({ quality }), imageminPngquant({ quality: [pngQuality, pngQuality] })],
		});
		console.log(files);
		shell.openPath(dest);

		mainWindow.webContents.send('image:done', { imgPath, quality, dest });
	} catch (err) {
		console.log(err);
	}
}

// Mainly for mac
app.on('window-all-closed', () => {
	if (!isMac) {
		app.quit();
	}
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
