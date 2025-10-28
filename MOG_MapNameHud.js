//=============================================================================
// MOG_MapNameHud.js → 保留原动画 + 永久小地图/红点/分层文字
//=============================================================================
/*: @plugindesc 地图浮动框(永久小地图/红点/分层文字) @author Moghunter modified by hfnetman
 * @param 平移-浮动框 X @default 20
 * @param 平移-浮动框 Y @default 20
 * @param 字体大小 @default 16
 * @param 地图名Y偏移 @default 6
 * @param 坐标Y偏移 @default 28
 */

var Moghunter = Moghunter || {};
Moghunter.parameters = PluginManager.parameters('MOG_MapNameHud');

// 兼容低版本
if (!Bitmap.prototype.replacePixels) {
    Bitmap.prototype.replacePixels = function(pixels) {
        const ctx = this._context;
        const id = ctx.createImageData(this.width, this.height);
        id.data.set(pixels);
        ctx.putImageData(id, 0, 0);
        this._setDirty();
    };
}

// ------------------------------------------------------------------
// Scene_Map 扩展
// ------------------------------------------------------------------
var _Scene_Map_createSpriteset = Scene_Map.prototype.createSpriteset;
Scene_Map.prototype.createSpriteset = function() {
    _Scene_Map_createSpriteset.call(this);
    if (!this._hudField) this.createHudField();
    this.createMiniMapRoot();   // 永久小地图层
    this.createMapNameHud();    // MOG 原浮动框（一次性动画）
};

Scene_Map.prototype.createHudField = function() {
    this._hudField = new Sprite();
    this._hudField.z = 10;
    this.addChild(this._hudField);
};

// 永久小地图根层
Scene_Map.prototype.createMiniMapRoot = function() {
    this._miniMapRoot = new Sprite();
    this._miniMapRoot.x = Number(Moghunter.parameters['平移-浮动框 X']) || 20;
    this._miniMapRoot.y = Number(Moghunter.parameters['平移-浮动框 Y']) || 20;
    this.addChild(this._miniMapRoot);
    this.createMiniMapSprite();   // 底层
    this.createMapNameSprite();   // 中层
    this.createCoordSprite();     // 顶层
    this.createRedDotSprite();    // 红点（最顶层）
};

// ----------- 小地图 -----------
Scene_Map.prototype.createMiniMapSprite = function() {
    const size = 120;
    this._miniMapSprite = new Sprite(new Bitmap(size, size));
    this._miniMapRoot.addChild(this._miniMapSprite);
    this.refreshMiniMapBitmap();
};

// ============ 地图名（单独精灵） ============
Scene_Map.prototype.createMapNameSprite = function () {
    this._mapNameSprite = new Sprite(new Bitmap(120, 24));
    this._mapNameSprite.bitmap.fontSize = 18;
    this._mapNameSprite.y = 6;          // ← 硬编码：整体下移 6 像素
    this._miniMapRoot.addChild(this._mapNameSprite);
};

// ============ 坐标（单独精灵） ============
Scene_Map.prototype.createCoordSprite = function () {
    this._coordSprite = new Sprite(new Bitmap(120, 20));
    this._coordSprite.bitmap.fontSize = 16;
    this._coordSprite.y = 28;          // ← 硬编码：整体下移 28 像素
    this._miniMapRoot.addChild(this._coordSprite);
};


// ----------- 红点 -----------
Scene_Map.prototype.createRedDotSprite = function() {
    this._redDotSprite = new Sprite(new Bitmap(6, 6));
    this._redDotSprite.bitmap.fillRect(0, 0, 6, 6, 'red');
    this._miniMapRoot.addChild(this._redDotSprite);
};

// 刷新小地图像素
Scene_Map.prototype.refreshMiniMapBitmap = function() {
    const bmp = this._miniMapSprite.bitmap;
    const w = bmp.width;
    const h = bmp.height;
    const mapW = $dataMap.width;
    const mapH = $dataMap.height;
    const scale = Math.min(w / mapW, h / mapH);
    const pixels = new Uint8Array(4 * w * h);

    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const mx = Math.floor(i / scale);
            const my = Math.floor(j / scale);
            let color = [96, 96, 96, 255];          // 障碍
            if ($gameMap.checkPassage(mx, my, 0x0f)) color = [128, 200, 128, 255]; // 可通行
            const idx = 4 * (j * w + i);
            pixels[idx] = color[0]; pixels[idx + 1] = color[1];
            pixels[idx + 2] = color[2]; pixels[idx + 3] = color[3];
        }
    }
    bmp.replacePixels(pixels);
};

// 每帧更新文字 & 红点
var _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    if (this._miniMapRoot) {
        const scale = this._miniMapSprite.bitmap.width / $dataMap.width;
        this._redDotSprite.x = $gamePlayer.x * scale - 3;
        this._redDotSprite.y = $gamePlayer.y * scale - 3;

        this._mapNameSprite.bitmap.clear();
        this._mapNameSprite.bitmap.drawText($gameMap.displayName(), 0, 0, 120, 24, 'center');

        this._coordSprite.bitmap.clear();
        this._coordSprite.bitmap.drawText(`X:${$gamePlayer.x}  Y:${$gamePlayer.y}`, 0, 0, 120, 20, 'center');
    }
};

// 切换地图重绘小地图
var _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
Scene_Map.prototype.onMapLoaded = function() {
    _Scene_Map_onMapLoaded.call(this);
    if (this._miniMapSprite) this.refreshMiniMapBitmap();
};

// ------------------------------------------------------------------
// 原 MOG 接口：一次性地图名浮动框（保留）
// ------------------------------------------------------------------
Scene_Map.prototype.createMapNameHud = function() {
    if ($gameMap.displayName()) {
        this._mapNameHud = new Map_Name_Hud();
        this._mapNameHud.mz = 140;
        this._hudField.addChild(this._mapNameHud);
    }
};

// ------------------------------------------------------------------
// Map_Name_Hud 类（精简版，仅负责一次性动画）
// ------------------------------------------------------------------
function Map_Name_Hud() {
    this.initialize.apply(this, arguments);
}
Map_Name_Hud.prototype = Object.create(Sprite.prototype);
Map_Name_Hud.prototype.constructor = Map_Name_Hud;

Map_Name_Hud.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);
    this.createSprites();
};
Map_Name_Hud.prototype.createSprites = function() {
    this._layout = new Sprite(ImageManager.load_MapUi('地图浮动框-框'));
    this._layout.anchor.set(0.5);
    this.addChild(this._layout);

    this._name = new Sprite(new Bitmap(160, 32));
    this._name.bitmap.fontSize = 18;
    this._name.anchor.set(0.5);
    this.addChild(this._name);
};
Map_Name_Hud.prototype.update = function() {
    Sprite.prototype.update.call(this);
    const d = $gameSystem._mapNameData;
    if (d.duration > 0) { d.duration--; d.opacity += 5; }
    else { d.opacity -= 5; if (d.opacity < 0) d.opacity = 0; }
    this.opacity = d.opacity;
    this._layout.x = 20 + d.cw / 2; this._layout.y = 20 + d.ch / 2;
    this._name.x = this._layout.x; this._name.y = this._layout.y - 10;
    this._name.bitmap.clear();
    this._name.bitmap.drawText($gameMap.displayName(), 0, 0, 160, 32, 'center');
};
