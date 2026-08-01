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

async function createContainer(opts) {
  const { image, name, ports = [], volumes = [], env = [], network = 'bridge', privileged = false, memoryMB, restartPolicy = 'unless-stopped' } = opts;

  const ExposedPorts = {};
  const PortBindings = {};
  ports.forEach((p) => {
    // aceita "8080" (mesma porta host/container) ou "8080:80" (host:container)
    const [hostPort, containerPort] = p.includes(':') ? p.split(':') : [p, p];
    const key = `${containerPort}/tcp`;
    ExposedPorts[key] = {};
    PortBindings[key] = [{ HostPort: String(hostPort) }];
  });

  const Binds = volumes
    .filter((v) => v.host && v.container)
    .map((v) => `${v.host}:${v.container}`);

  const container = await docker.createContainer({
    Image: image,
    name,
    Env: env.filter((e) => e.key).map((e) => `${e.key}=${e.value || ''}`),
    ExposedPorts,
    HostConfig: {
      PortBindings,
      Binds,
      NetworkMode: network,
      Privileged: !!privileged,
      RestartPolicy: { Name: restartPolicy },
      Memory: memoryMB ? memoryMB * 1024 * 1024 : undefined,
    },
  });

  await container.start();
  return container.id.slice(0, 12);
}

async function removeContainer(id) {
  const container = docker.getContainer(id);
  await container.remove({ force: true });
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
  createContainer,
  removeContainer,
  getLogs,
};
