const path = require('path');

describe('taskRunner spawn mock @taskRunner', () => {
  let originalSpawn;
  let taskRunner;
  const events = [];
  const fakeProcs = [];
  function makeFake(codeSequence = [0], options={}) {
    let closed = false;
    let listeners = { close: [], error: [], exit: [] };
    let stdoutListeners = []; let stderrListeners = [];
    const proc = {
      pid: Math.floor(Math.random()*10000)+1000,
      stdout: { on: (ev,cb)=>{ if(ev==='data') stdoutListeners.push(cb); } },
      stderr: { on: (ev,cb)=>{ if(ev==='data') stderrListeners.push(cb); } },
      on: (ev,cb)=>{ if(listeners[ev]) listeners[ev].push(cb); },
      once: (ev,cb)=>{ if(listeners[ev]) listeners[ev].push((...a)=>{ cb(...a); listeners[ev]=[]; }); },
      kill: (sig)=>{ events.push(`kill:${sig||'SIGTERM'}`); // simulate immediate close with code 0 (canceled path handled in task)
        finish(codeSequence[0]); },
      unref: ()=>{},
    };
    function emit(stream, text){
      (stream==='stdout'?stdoutListeners:stderrListeners).forEach(cb=>cb(Buffer.from(text))); }
    function finish(code){ if(closed) return; closed=true; listeners.close.forEach(cb=>cb(code)); listeners.exit.forEach(cb=>cb(code)); }
    setTimeout(()=>{ emit('stdout','mock start'); },5);
    // If retry expected, first code!=0 triggers retry path
    setTimeout(()=>{ finish(codeSequence.shift() ?? 0); }, 30 + (options.delay||0));
    fakeProcs.push(proc);
    return proc;
  }

  beforeEach(() => {
    jest.resetModules();
    originalSpawn = require('child_process').spawn;
    jest.spyOn(require('child_process'), 'spawn').mockImplementation((cmd,args,opts)=>{
      events.push(`spawn:${cmd}`);
      // Simulate retry for tasks with retry config: rely on ATTEMPT env injected by taskRunner
      if(cmd === process.execPath && Array.isArray(args) && args.join(' ').includes('attempt')){
        const attempt = (opts && opts.env && opts.env.ATTEMPT) ? Number(opts.env.ATTEMPT) : 1;
        if(attempt === 1){
          return makeFake([1,0]); // first closes with 1 (trigger retry), second success 0
        }
        return makeFake([0]);
      }
      return makeFake([0]);
    });
    process.env.JEST_WORKER_ID = '1';
    taskRunner = require('../../utils/taskRunner');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('cancel calls kill and sets status CANCELED', (done) => {
    const t = taskRunner.createTask('test:hold');
    const id = taskRunner.runTask(t);
    setTimeout(()=>{ t.kill(); }, 25);
    setTimeout(()=>{
      const cur = taskRunner.getTask(id);
      expect(cur.status).toBe('canceled');
      // kill might happen via taskkill on Windows or direct SIGTERM; accept either spawn of taskkill or kill event capture
      const sawKill = events.some(e=>e.startsWith('kill')) || events.some(e=>/spawn:taskkill/i.test(e));
      expect(sawKill).toBe(true);
      done();
    }, 180);
  });

  test('retry path transitions to success after failure', (done) => {
    const t = taskRunner.createTask('test:flaky-once');
    const id = taskRunner.runTask(t);
    const timeout = setTimeout(()=>{ clearInterval(poll); throw new Error('retry test timeout'); }, 3000);
    const poll = setInterval(()=>{
      const cur = taskRunner.getTask(id);
      if(cur.status === 'success'){ clearInterval(poll); clearTimeout(timeout); done(); }
    }, 40);
  });
});
