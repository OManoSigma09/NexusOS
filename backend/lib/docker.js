// lib/docker.js
// Fala com o daemon Docker do HOST através do socket montado no container:
//   -v /var/run/docker.sock:/var/run/docker.sock
// É a mesma técnica usada pelo Portainer e pelo CasaOS.

const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  return containers.map((c) => ({
    id: c.Id.slice(0, 12),
    name: (c.Names[0] || '').replace(/^\//, ''),
    image: c.Image,
    status: c.State === 'running' ? 'on' : (c.State === 'restarting' ? 'err' : 'off'),
    statusText: c.Status,
    ports: c.Ports.map((p) => p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`),
  }));
}

async function getContainerStats(id) {
  const container = docker.getContainer(id);
  const stats = await container.stats({ stream: false });

  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount = stats.cpu_stats.online_cpus || (stats.cpu_stats.cpu_usage.percpu_usage || []).length || 1;
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

  const memUsage = stats.memory_stats.usage || 0;
  const memLimit = stats.memory_stats.limit || 1;

  return {
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memUsageMB: Math.round(memUsage / 1024 / 1024),
    memLimitMB: Math.round(memLimit / 1024 / 1024),
  };
}

async function startContainer(id) {
  await docker.getContainer(id).start();
}

async function stopContainer(id) {
  await docker.getContainer(id).stop();
}

async function restartContainer(id) {
  await docker.getContainer(id).restart();
}

async function getLogs(id, tail = 200) {
  const container = docker.getContainer(id);
  const buffer = await container.logs({ stdout: true, stderr: true, tail, timestamps: true });
  // remove os 8 bytes de header multiplexado que o Docker adiciona por linha
  return buffer.toString('utf-8').replace(/[\x00-\x08]/g, '');
}

module.exports = {
  docker,
  listContainers,
  getContainerStats,
  startContainer,
  stopContainer,
  restartContainer,
  getLogs,
};
