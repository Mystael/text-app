/**
 * @constructor
 */
function TextApp() {
  this.editor_ = null;
  this.settings_ = null;
  this.tabs_ = null;

  this.dialogController_ = null;
  this.hotkeysController_ = null;
  this.menuController_ = null;
  this.searchController_ = null;
  this.settingsController_ = null;
  this.windowController_ = null;

  this.hasFrame_ = false;
}

/**
 * Called when all the resources have loaded. All initializations should be done
 * here.
 */
TextApp.prototype.init = function() {
  this.settings_ = new Settings();
  this.analytics_ = new Analytics();
  // Editor is initalised after settings are ready.
  this.editor_ = null;

  if (this.settings_.isReady()) {
    this.onSettingsReady_();
  } else {
    $(document).bind('settingsready', this.onSettingsReady_.bind(this))
  }
  $(document).bind('settingschange', this.onSettingsChanged_.bind(this))

};

/**
 * Open one tab per FileEntry passed or a new Untitled tab if no tabs were
 * successfully opened.
 * @param {!Array.<FileEntry>} entries The file entries to be opened.
 */
TextApp.prototype.openTabs = function(entries) {
  for (var i = 0; i < entries.length; i++) {
    this.tabs_.openFileEntry(entries[i]);
  }
  this.windowController_.focus_();
  if (!this.tabs_.hasOpenTab()) {
    this.tabs_.newTab();
  }
};

TextApp.prototype.setHasChromeFrame = function(hasFrame) {
  this.hasFrame_ = hasFrame;
  this.windowController_.windowControlsVisible(!hasFrame);
};

/**
 * @return {Array.<FileEntry>}
 */
TextApp.prototype.getFilesToRetain = function() {
  return this.tabs_.getFilesToRetain();
};

TextApp.prototype.setTheme = function() {
  var theme = this.settings_.get('theme');
  this.windowController_.setTheme(theme);
  this.editor_.setTheme(theme);
};

/**
 * Remove the editor so it can be reinitialized.
 * @param editor The Dom element containing the editor
 */
TextApp.prototype.removeEditor = function(editor) {
  // Let the object do any clean up it needs
  if (this.editor_ !== null) {
    this.editor_.destory();
  }

  // Clear the DOM
  while (editor.firstElementChild !== null) {
    editor.firstElementChild.remove();
  }
};

/**
 * Called when all the services have started and settings are loaded.
 */
TextApp.prototype.onSettingsReady_ = function() {
  this.initEditor_();

  this.analytics_.setEnabled(this.settings_.get('analytics'));
  this.analytics_.reportSettings(this.settings_);
  this.windowController_.setAlwaysOnTop(this.settings_.get('alwaysontop'));

  chrome.runtime.getBackgroundPage(function(bg) {
    bg.background.onWindowReady(this);
  }.bind(this));
};

/**
 * Create a new editor and load all settings
 */
TextApp.prototype.initEditor_ = function() {
  // Remove any editor that already exists
  if (this.editor_ !== null) {
    const editor = document.getElementById('editor');
    this.removeEditor(editor);
  }

  if (this.settings_.get('accessibilitymode')) {
    this.editor_ = new EditorTextArea(editor, this.settings_);
  } else {
    this.editor_ = new EditorCodeMirror(editor, this.settings_);
  }

  // set up all dependent objects
  this.dialogController_ = new DialogController($('#dialog-container'),
                                                this.editor_);
  this.tabs_ = new Tabs(this.editor_, this.dialogController_, this.settings_);

  this.menuController_ = new MenuController(this.tabs_);
  this.searchController_ = new SearchController(this.editor_.getSearch());
  this.settingsController_ = new SettingsController(this.settings_);
  this.windowController_ = new WindowController(
      this.editor_, this.settings_, this.analytics_, this.tabs_);
  this.hotkeysController_ = new HotkeysController( this.windowController_,
      this.tabs_, this.editor_, this.settings_, this.analytics_);

  this.setTheme();
  this.editor_.setFontSize(this.settings_.get('fontsize'));
  this.editor_.showHideLineNumbers(this.settings_.get('linenumbers'));
  this.editor_.setSmartIndent(this.settings_.get('smartindent'));
  this.editor_.replaceTabWithSpaces(this.settings_.get('spacestab'));
  this.editor_.setTabSize(this.settings_.get('tabsize'));
  this.editor_.setWrapLines(this.settings_.get('wraplines'));
};

/**
 * @param {Event} e
 * @param {string} key
 * @param {*} value
 */
TextApp.prototype.onSettingsChanged_ = function(e, key, value) {
  switch (key) {
    case 'alwaysontop':
      this.windowController_.setAlwaysOnTop(value);
      break;

    case 'fontsize':
      this.editor_.setFontSize(value);
      break;

    case 'linenumbers':
      this.editor_.showHideLineNumbers(value);
      break;

    case 'smartindent':
      this.editor_.setSmartIndent(value);
      break;

    case 'spacestab':
      this.editor_.replaceTabWithSpaces(this.settings_.get('spacestab'));
      break;

    case 'tabsize':
      this.editor_.setTabSize(value);
      break;

    case 'theme':
      this.setTheme();
      break;

    case 'wraplines':
      this.editor_.setWrapLines(value);
      break;

    case 'accessibilitymode':
      // This recreates a new editor and inserts it into the dom on a11y mode
      // change, this is quite slow but the complexity of keeping both alive
      // and switching them out seemed excessive given the frequence that this
      // setting will likely be changed.
      this.initEditor_();
      break;
  }
};

const textApp = new TextApp();

document.addEventListener('DOMContentLoaded', function() {
  textApp.init();
});

