export function drawCapabilityRadar(canvas, labels, series) {
  const clippedSeries = series.slice(0, 3);
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.31;

  ctx.clearRect(0, 0, width, height);

  for (let ring = 1; ring <= 5; ring += 1) {
    const factor = ring / 5;
    ctx.beginPath();
    labels.forEach((_, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * factor;
      const y = centerY + Math.sin(angle) * radius * factor;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.stroke();
  }

  labels.forEach((label, i) => {
    const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const tx = centerX + Math.cos(angle) * (radius + 28);
    const ty = centerY + Math.sin(angle) * (radius + 28);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.stroke();

    ctx.fillStyle = '#b7c8e3';
    ctx.font = '11px Inter';
    ctx.textAlign = tx < centerX - 10 ? 'right' : tx > centerX + 10 ? 'left' : 'center';
    ctx.fillText(label, tx, ty);
  });

  clippedSeries.forEach((item) => {
    const values = item.values.map((value) => Math.max(0, Math.min(5, value)) / 5);
    ctx.beginPath();
    values.forEach((value, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = item.fill;
    ctx.strokeStyle = item.stroke;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    values.forEach((value, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = item.stroke;
      ctx.fill();
    });
  });
}

export function buildRadarSeries(participant, teamMedian, target) {
  return [
    { label: 'Participant', values: participant, fill: 'rgba(59,162,255,0.28)', stroke: '#68e1fd' },
    { label: 'Team median', values: teamMedian, fill: 'rgba(45,212,191,0.2)', stroke: '#2dd4bf' },
    { label: 'Target benchmark', values: target, fill: 'rgba(245,158,11,0.15)', stroke: '#f59e0b' }
  ];
}
