// Register a keyboard shortcut
PluginAPI.registerShortcut({
  id: 'show_yesterday',
  label: "Show Yesterday's Tasks",
  onExec: function () {
    PluginAPI.showIndexHtmlAsView();
  },
});