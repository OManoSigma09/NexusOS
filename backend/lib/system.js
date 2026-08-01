// lib/system.js
// Coleta métricas reais do HOST. Atenção: dentro de um container, a lib
// systeminformation enxerga o cgroup do container por padrão. Pra pegar os
// números do host de verdade, o docker-compose monta /proc e /sys como
// somente-leitura e passa HOST_PROC / HOST_SYS — veja docker-compose.yml.

const si = require('systeminformation');

async function getStats() {
  const [cpu, mem, fsSize, net, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.time(),
  ]);

  const mainDisk = fsSize.sort((a, b) => b.size - a.size)[0] || { size: 0, used: 0 };
  const mainNet = net[0] || { rx_sec: 0, tx_sec: 0 };

  return {
    cpu: {
      percent: Math.round(cpu.currentLoad * 10) / 10,
    },
    memory: {
      usedGB: Math.round((mem.active / 1024 / 1024 / 1024) * 10) / 10,
      totalGB: Math.round((mem.total / 1024 / 1024 / 1024) * 10) / 10,
      percent: Math.round((mem.active / mem.total) * 1000) / 10,
    },
    disk: {
      usedGB: Math.round(mainDisk.used / 1024 / 1024 / 1024),
      totalGB: Math.round(mainDisk.size / 1024 / 1024 / 1024),
      percent: Math.round(mainDisk.use || 0),
    },
    network: {
      rxMbps: Math.round(((mainNet.rx_sec || 0) * 8) / 1024 / 1024 * 10) / 10,
      txMbps: Math.round(((mainNet.tx_sec || 0) * 8) / 1024 / 1024 * 10) / 10,
    },
    uptimeSec: time.uptime,
  };
}

async function getInfo() {
  const [osInfo, dockerVer] = await Promise.all([
    si.osInfo(),
    si.versions('docker').catch(() => ({ docker: null })),
  ]);
  return {
    os: osInfo.distro || osInfo.platform,
    kernel: osInfo.kernel,
    arch: osInfo.arch,
    dockerVersion: dockerVer.docker || 'desconhecida',
  };
}

module.exports = { getStats, getInfo };
