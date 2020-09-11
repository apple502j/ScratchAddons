export default async ({ addon, global }) => {
  global.stackTraces = [];
  global.snapshots = [];
  const vm = await addon.tab.getScratchVM();

  const getSnapshot = thread => {
    const { target } = thread;
    const { runtime } = vm;
    const { ioDevices } = runtime;
    const stage = runtime.getTargetForStage();
    const stackFrame = thread.peekStackFrame();

    const [ rightFence, topFence ] = target.keepInFence(48000, 36000);
    const [ leftFence, bottomFence ] = target.keepInFence(-48000, -36000);

    return ({
      basic: {
        threads: runtime.threads.length,
        cloneCount: runtime._cloneCounter,
        timer: ioDevices.clock.projectTimer(),
        keysPressed: ioDevices.keyboard._keysPressed.slice(0),
        mouse: {
          x: ioDevices.mouse._scratchX,
          y: ioDevices.mouse._scratchY,
          down: ioDevices.mouse._isDown
        },
        targetOrder: runtime.executableTargets.map(t => ({
          name: t.getName(),
          id: t.id,
          isOriginal: t.isOriginal,
          isStage: t.isStage
        })),
        args: Object.assign({}, stackFrame.params)
      },
      target: {
        id: target.id,
        name: target.getName(),
        effects: Object.assign({}, target.effects),
        isOriginal: target.isOriginal,
        isStage: target.isStage,
        x: target.x,
        y: target.y,
        direction: target.direction,
        draggable: target.draggable,
        visible: target.visible,
        size: target.size,
        currentCostume: target.currentCostume,
        rotationStyle: target.rotationStyle,
        volume: target.volume,
        bounds: Object.assign({}, target.getBounds()),
        fence: {
          rightFence,
          topFence,
          leftFence,
          bottomFence
        },
        customState: JSON.parse(JSON.stringify(target._customState))
      },
      localVariables: Object.keys(target.variables).map(key => {
        const v = target.variables[key];
        if (v.type === 'broadcast_msg') return;
        return ({
          id: key,
          name: v.name,
          type: v.type,
          value: Array.isArray(v.value) ? v.value.slice(0) : v.value
        });
      }).filter(Boolean),
      globalVariables: Object.keys(stage.variables).map(key => {
        const v = stage.variables[key];
        if (v.type === 'broadcast_msg') return;
        return ({
          id: key,
          name: v.name,
          type: v.type,
          value: Array.isArray(v.value) ? v.value.slice(0) : v.value
        });
      }).filter(Boolean),
      stage: {
        tempo: stage.tempo,
        videoTransparency: stage.videoTransparency,
        videoState: stage.videoState
      }
    });
  };

  const getStackTrace = thread => {
    const { stack, stackFrames, target } = thread;
    const stackTrace = [];
    stack.forEach((blockId, i) => {
      const block = target.blocks._blocks[blockId];
      const stackFrame = stackFrames[i];
      let procedure = {};
      if (block.opcode === "procedures_call") {
        procedure = {
          proccode: block.mutation.proccode,
          warp: block.mutation.warp.toString() === "true",
          params: Object.assign({}, stackFrame.params)
        };
      }
      stackTrace.unshift({
        block: {
          id: blockId,
          opcode: block.opcode
        },
        procedure,
        stackFrame: {
          executionContext: Object.assign({}, stackFrame.executionContext)
        },
        target: {
          name: target.getName(),
          id: target.id,
          isStage: target.isStage,
          isOriginal: target.isOriginal
        }
      });
    });
    return stackTrace;
  }

  const oldStepToProcedure = vm.runtime.sequencer.stepToProcedure;
  vm.runtime.sequencer.stepToProcedure = function (thread, proccode) {
    if (proccode.startsWith('take debug snapshot')) {
      global.snapshots.unshift(getSnapshot(thread));
      return;
    }
    if (proccode.startsWith('take stack trace')) {
      global.stackTraces.unshift(getSnapshot(thread));
      return;
    }
    return oldStepToProcedure.call(this, thread, proccode);
  };
};
