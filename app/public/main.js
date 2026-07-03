let cpuData = [];
let memoryData = [];
let diskData = [];

// ApexCharts 옵션
const options = {
  chart: {
    type: "line",
    height: 350,
    animations: { enabled: true, easing: "linear", dynamicAnimation: { speed: 1000 } },
    toolbar: { show: false },
  },
  stroke: { curve: "smooth" },
  series: [
    { name: "CPU (%)", data: [] },
    { name: "Memory (%)", data: [] },
    { name: "Disk (%)", data: [] },
  ],
  xaxis: { type: "datetime", labels: { datetimeUTC: false } },
  yaxis: { min: 0, max: 100, tickAmount: 5, title: { text: "사용률 (%)" } },
  colors: ["#3B82F6", "#10B981", "#F59E0B"],
};

const chart = new ApexCharts(document.querySelector("#chart"), options);
chart.render();

// 카드 업데이트 함수
function updateCards(cpu, mem, disk) {
  document.getElementById("cpuUsage").textContent = `${cpu}%`;
  document.getElementById("memoryUsage").textContent = `${mem}%`;
  document.getElementById("diskUsage").textContent = `${disk}%`;
}

// 모달 열기
function showModal(message) {
  document.getElementById("alertMessage").textContent = message;
  document.getElementById("alertModal").style.display = "flex";
}
// 모달 닫기
function closeModal() {
  document.getElementById("alertModal").style.display = "none";
}

// 데이터 시뮬레이션 (실제로는 API/WebSocket 연동)
setInterval(() => {
  const now = new Date().getTime();
  const cpu = Math.floor(Math.random() * 100);
  const mem = Math.floor(Math.random() * 100);
  const disk = Math.floor(Math.random() * 100);

  cpuData.push({ x: now, y: cpu });
  memoryData.push({ x: now, y: mem });
  diskData.push({ x: now, y: disk });

  if (cpuData.length > 20) {
    cpuData.shift();
    memoryData.shift();
    diskData.shift();
  }

  chart.updateSeries([
    { name: "CPU (%)", data: cpuData },
    { name: "Memory (%)", data: memoryData },
    { name: "Disk (%)", data: diskData },
  ]);

  updateCards(cpu, mem, disk);

  // ⚠️ 임계치(80%) 이상이면 모달 경고
  if (cpu >= 80) showModal(`CPU 사용량이 ${cpu}%를 초과했습니다!`);
  else if (mem >= 80) showModal(`메모리 사용량이 ${mem}%를 초과했습니다!`);
  else if (disk >= 80) showModal(`디스크 사용량이 ${disk}%를 초과했습니다!`);
}, 2000);
