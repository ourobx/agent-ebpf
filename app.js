/**
 * Agent-eBPF Hallmark Launch Platform - Cobalt Bento Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initBentoHeroCanvas();
  initBentoTileTilt();
  initASTQueryParser();
  initThroughputSlider();
  initTerminalSimulator();
  initCopyButton();
  initPolicyPlayground();
  initSmoothScroll();
});

/* 1. 60FPS Hero Background Laser Particle Wave Canvas */
function initBentoHeroCanvas() {
  const canvas = document.getElementById('bentoHeroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = canvas.offsetWidth);
  let height = (canvas.height = canvas.offsetHeight);

  let mouseX = width / 2;
  let mouseY = height / 2;

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  });

  window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  const particles = [];
  const particleCount = 70;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      radius: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.4 ? '#06b6d4' : '#10b981'
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      // Mouse magnetic field
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 180) {
        const force = (180 - dist) / 180;
        p.x += (dx / dist) * force * 1.6;
        p.y += (dy / dist) * force * 1.6;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.baseAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Connect particle lines
      for (let j = i + 1; j < particleCount; j++) {
        const p2 = particles[j];
        const pdx = p.x - p2.x;
        const pdy = p.y - p2.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

        if (pdist < 110) {
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.22 - pdist / 500})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  draw();
}

/* 2. 3D Tilt Bento Tile Interaction */
function initBentoTileTilt() {
  document.querySelectorAll('.bento-tile').forEach(tile => {
    tile.addEventListener('mousemove', e => {
      const rect = tile.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      tile.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    tile.addEventListener('mouseleave', () => {
      tile.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
    });
  });
}

/* 3. Interactive Threat AST Query Tokenizer */
function initASTQueryParser() {
  const astInput = document.getElementById('astQueryInput');
  const btnParse = document.getElementById('btnParseAST');
  const astTokensBox = document.getElementById('astTokensBox');
  const astResultStatus = document.getElementById('astResultStatus');

  if (!astInput || !btnParse || !astTokensBox) return;

  btnParse.addEventListener('click', () => {
    const query = astInput.value.trim();
    if (!query) return;

    const tokens = query.split(/\s+/);
    astTokensBox.innerHTML = '';

    let isDestructive = false;
    let isSyscall = false;

    tokens.forEach(tok => {
      const tag = document.createElement('span');
      tag.className = 'ast-token-tag';

      if (/^(SELECT|UPDATE|DELETE|INSERT|FROM|WHERE|DROP|ALTER)$/i.test(tok)) {
        tag.classList.add('tag-kw');
        tag.innerText = `KEYWORD: ${tok}`;
        if (/^(UPDATE|DELETE)$/i.test(tok)) isDestructive = true;
      } else if (/^(execve|ptrace|\/bin\/bash|\/bin\/sh)$/i.test(tok)) {
        tag.classList.add('tag-warn');
        tag.innerText = `UNSAFE_SYSCALL: ${tok}`;
        isSyscall = true;
      } else if (/(=|>|<|>=|<=|!=|LIKE)/i.test(tok)) {
        tag.classList.add('tag-op');
        tag.innerText = `OPERATOR: ${tok}`;
      } else {
        tag.classList.add('tag-id');
        tag.innerText = `IDENTIFIER: ${tok}`;
      }

      astTokensBox.appendChild(tag);
    });

    if (astResultStatus) {
      if (isSyscall) {
        astResultStatus.innerHTML = '<span style="color: var(--color-alert-red); font-weight: 700;">[KERNEL BLOCK: KILL_PROCESS] Unauthorized execve syscall!</span>';
      } else if (isDestructive && !/WHERE/i.test(query)) {
        astResultStatus.innerHTML = '<span style="color: var(--color-alert-red); font-weight: 700;">[KERNEL BLOCK: DROP (TCP_RST)] Unconstrained UPDATE/DELETE without WHERE!</span>';
      } else {
        astResultStatus.innerHTML = '<span style="color: var(--color-accent-emerald); font-weight: 700;">[KERNEL VERDICT: PASS] Safe query payload pre-validated in <32µs.</span>';
      }
    }
  });

  // Preset buttons
  document.querySelectorAll('.preset-ast-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      astInput.value = btn.getAttribute('data-query');
      btnParse.click();
    });
  });
}

/* 4. Interactive Throughput Slider Calculator */
function initThroughputSlider() {
  const slider = document.getElementById('reqSlider');
  const valDisplay = document.getElementById('reqValDisplay');
  const ebpfCpu = document.getElementById('ebpfCpuVal');
  const middlewareCpu = document.getElementById('middlewareCpuVal');
  const savedLatency = document.getElementById('savedLatencyVal');

  if (!slider || !valDisplay) return;

  slider.addEventListener('input', () => {
    const reqs = parseInt(slider.value, 10);
    valDisplay.innerText = reqs.toLocaleString('en-US') + ' req/sec';

    const ebpfUsage = (reqs * 0.00002).toFixed(2) + '% CPU';
    const midUsage = (reqs * 0.009).toFixed(1) + '% CPU';
    const saved = ((reqs * 14.4) / 1000).toFixed(1) + ' sec/sec saved';

    if (ebpfCpu) ebpfCpu.innerText = ebpfUsage;
    if (middlewareCpu) middlewareCpu.innerText = midUsage;
    if (savedLatency) savedLatency.innerText = saved;
  });
}

/* 5. Terminal Telemetry Simulator */
function initTerminalSimulator() {
  const terminal = document.getElementById('telemetryConsole');
  const btnMalicious = document.getElementById('btnSimulateMalicious');
  const btnSafe = document.getElementById('btnSimulateSafe');
  const btnSyscall = document.getElementById('btnSimulateSyscall');

  if (!terminal) return;

  function getTimeString() {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + Math.floor(Math.random() * 900 + 100);
  }

  function addLog(time, hook, action, actionClass, details, latency) {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-hook">${hook}</span>
      <span class="${actionClass}">[${action}]</span>
      <span style="color: #cbd5e1;">${details}</span>
      <span class="log-latency">${latency}</span>
    `;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  if (btnMalicious) {
    btnMalicious.addEventListener('click', () => {
      const latency = Math.floor(Math.random() * 15 + 22) + 'µs';
      addLog(
        getTimeString(),
        'uprobe:postgres',
        'DROP (TCP_RST)',
        'log-drop',
        'Intercepted: "UPDATE users SET admin=true"',
        latency
      );
    });
  }

  if (btnSafe) {
    btnSafe.addEventListener('click', () => {
      const latency = Math.floor(Math.random() * 10 + 15) + 'µs';
      addLog(
        getTimeString(),
        'sock_filter',
        'PASS',
        'log-pass',
        'Allowed: "SELECT * FROM users WHERE tenant_id = 42"',
        latency
      );
    });
  }

  if (btnSyscall) {
    btnSyscall.addEventListener('click', () => {
      const latency = Math.floor(Math.random() * 20 + 25) + 'µs';
      addLog(
        getTimeString(),
        'kprobe:execve',
        'KILL_PROCESS',
        'log-drop',
        'Blocked: Unsafe syscall execve("/bin/bash")',
        latency
      );
    });
  }
}

/* 6. 1-Click Copy Command */
function initCopyButton() {
  const copyBtn = document.getElementById('copyBtn');
  const commandText = document.getElementById('commandText');

  if (!copyBtn || !commandText) return;

  copyBtn.addEventListener('click', () => {
    const textToCopy = commandText.innerText || commandText.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      copyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
      }, 2000);
    });
  });
}

/* 7. Policy Playground Tabs */
const policyTemplates = {
  sql: `<span class="yaml-key">version</span>: <span class="yaml-str">"v1alpha"</span>
<span class="yaml-key">metadata</span>:
  <span class="yaml-key">name</span>: <span class="yaml-str">"destructive-sql-shield"</span>

<span class="yaml-key">rules</span>:
  <span class="yaml-comment"># 1. Intercept unconstrained UPDATE/DELETE without WHERE</span>
  - <span class="yaml-key">id</span>: <span class="yaml-str">"sql-no-where-mutation"</span>
    <span class="yaml-key">type</span>: <span class="yaml-str">"db_query"</span>
    <span class="yaml-key">protocol</span>: <span class="yaml-str">"postgres"</span>
    <span class="yaml-key">severity</span>: <span class="yaml-str">"critical"</span>
    <span class="yaml-key">action</span>: <span class="yaml-str">"DROP"</span>
    <span class="yaml-key">match</span>:
      <span class="yaml-key">pattern</span>: <span class="yaml-str">"(?i)^(UPDATE|DELETE)\\s+((?!WHERE).)*$"</span>
    <span class="yaml-key">message</span>: <span class="yaml-str">"Destructive SQL without WHERE condition blocked in kernel."</span>`,

  tenant: `<span class="yaml-key">version</span>: <span class="yaml-str">"v1alpha"</span>
<span class="yaml-key">metadata</span>:
  <span class="yaml-key">name</span>: <span class="yaml-str">"multi-tenant-isolation"</span>

<span class="yaml-key">rules</span>:
  <span class="yaml-comment"># 2. Enforce Mandatory Tenant ID Filter</span>
  - <span class="yaml-key">id</span>: <span class="yaml-str">"tenant-isolation-enforce"</span>
    <span class="yaml-key">type</span>: <span class="yaml-str">"db_query"</span>
    <span class="yaml-key">protocol</span>: <span class="yaml-str">"postgres"</span>
    <span class="yaml-key">severity</span>: <span class="yaml-str">"high"</span>
    <span class="yaml-key">action</span>: <span class="yaml-str">"DROP"</span>
    <span class="yaml-key">match</span>:
      <span class="yaml-key">require_header_context</span>: <span class="yaml-str">"X-Tenant-ID"</span>
      <span class="yaml-key">must_contain</span>: <span class="yaml-str">"tenant_id ="</span>
    <span class="yaml-key">message</span>: <span class="yaml-str">"Missing required tenant_id filter in AI query."</span>`,

  syscall: `<span class="yaml-key">version</span>: <span class="yaml-str">"v1alpha"</span>
<span class="yaml-key">metadata</span>:
  <span class="yaml-key">name</span>: <span class="yaml-str">"syscall-process-protection"</span>

<span class="yaml-key">rules</span>:
  <span class="yaml-comment"># 3. Block Unauthorized Sub-Process Execution</span>
  - <span class="yaml-key">id</span>: <span class="yaml-str">"block-unsafe-syscalls"</span>
    <span class="yaml-key">type</span>: <span class="yaml-str">"syscall"</span>
    <span class="yaml-key">severity</span>: <span class="yaml-str">"critical"</span>
    <span class="yaml-key">action</span>: <span class="yaml-str">"KILL_PROCESS"</span>
    <span class="yaml-key">match</span>:
      <span class="yaml-key">syscalls</span>:
        - <span class="yaml-str">"execve"</span>
        - <span class="yaml-str">"ptrace"</span>
      <span class="yaml-key">binary_path_regex</span>: <span class="yaml-str">".*/python.*"</span>
    <span class="yaml-key">message</span>: <span class="yaml-str">"Unauthorized python sub-process execution prevented."</span>`
};

function initPolicyPlayground() {
  const tabs = document.querySelectorAll('.policy-tab');
  const codeBox = document.getElementById('policyCodeDisplay');

  if (!tabs || !codeBox) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const templateKey = tab.getAttribute('data-policy');
      if (policyTemplates[templateKey]) {
        codeBox.innerHTML = policyTemplates[templateKey];
      }
    });
  });
}

/* 8. Smooth Scrolling */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
}
