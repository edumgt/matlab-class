// 클라우드 키워드 데이터 (단어, 가중치)
const cloudKeywords = [
  ["AWS", 50],
  ["Kubernetes", 40],
  ["Docker", 35],
  ["Terraform", 25],
  ["CI/CD", 30],
  ["Serverless", 20],
  ["DevOps", 28],
  ["Cloud Security", 22],
  ["GCP", 18],
  ["Azure", 15],
  ["Istio", 12],
  ["Helm", 10],
  ["Prometheus", 20],
  ["Grafana", 18],
  ["Ansible", 14],
];

// 워드클라우드 생성
WordCloud(document.getElementById("wordCloudCanvas"), {
  list: cloudKeywords,
  gridSize: 8,
  weightFactor: 8, // 단어 크기 스케일
  fontFamily: "Pretendard, sans-serif",
  color: () => {
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];
    return colors[Math.floor(Math.random() * colors.length)];
  },
  rotateRatio: 0.3, // 일부 단어만 회전
  rotationSteps: 2,
  backgroundColor: "#ffffff",
  click: (item) => {
    alert(`👉 ${item[0]} (${item[1]})`);
  },
});
