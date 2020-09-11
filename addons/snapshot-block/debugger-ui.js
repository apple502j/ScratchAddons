export default async ({ addon, global }) => {
  let opened = false;

  const STATE_SNAPSHOTS = "SNAPSHOTS";
  const STATE_STACKTRACES = "STACKTRACES";

  let debuggerState = STATE_SNAPSHOTS;

  const showDebugger = state => {
    state = state || addon.tab.redux.state;
    return (
      addon.tab.editorMode === "editor" &&
      opened &&
      state &&
      state.scratchGui.editorTab.activeTabIndex === 0 &&
      !state.scratchGui.mode.isFullScreen
    );
  };


  const dbgMain = document.createElement("div");
  dbgMain.hidden = !showDebugger();
  dbgMain.classList.add("debugger");
  dbgMain.id = "debugger";

  const dbgOption = document.createElement("select");
  dbgOption.id = "dbgOption";
  dbgOption.addEventListener("change", ev => {
    let v = ev.target.value;
    if (![STATE_SNAPSHOTS, STATE_STACKTRACES].includes(v)) {
      v = STATE_SNAPSHOTS;
    }
    debuggerState = v;
    updateDebugger();
  })
  dbgMain.appendChild(dbgOption);

  [[STATE_SNAPSHOTS, "Snapshots"], [STATE_STACKTRACES, "Stack Traces"]].forEach(
    ([value, name]) => {
      const opt = document.createElement("option");
      opt.textContent = name;
      opt.value = value;
      dbgOption.appendChild(opt);
    }
  )

  const dbgSnapshots = document.createElement("section");
  dbgSnapshots.hidden = debuggerState !== STATE_SNAPSHOTS;
  dbgSnapshots.classList.add("dbgSection");
  dbgMain.appendChild(dbgSnapshots);

  const dbgStackTraces = document.createElement("section");
  dbgStackTraces.hidden = debuggerState !== STATE_STACKTRACES;
  dbgStackTraces.classList.add("dbgSection");
  dbgMain.appendChild(dbgStackTraces);

  document.body.appendChild(dbgMain);

  const updateDebugger = state => {
    dbgMain.hidden = !showDebugger(state);
    console.log(debuggerState, STATE_SNAPSHOTS, STATE_STACKTRACES, dbgSnapshots.hidden, dbgStackTraces.hidden);
    dbgSnapshots.hidden = debuggerState !== STATE_SNAPSHOTS;
    dbgStackTraces.hidden = debuggerState !== STATE_STACKTRACES;
  };

  document.body.addEventListener("keydown", ev => {
    if (ev.isComposing) return;
    if (ev.ctrlKey && ev.key === "d") {
      ev.preventDefault();
      ev.stopPropagation();
      opened = !opened;
      updateDebugger();
    }
  });

  addon.tab.redux.addEventListener("statechanged", e => {
    const { action, next } = e.detail;
    if (
      action.type === "scratch-gui/mode/SET_FULL_SCREEN" ||
      action.type === "scratch-gui/navigation/ACTIVATE_TAB"
    ) updateDebugger(next);
  })
};
