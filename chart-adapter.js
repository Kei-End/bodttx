export function drawRadarChart(canvas, labels, series) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  const rings = 5;
  const axisPoints = [];

  ctx.clearRect(0, 0, width, height);

  for (let r = 1; r <= rings; r += 1) {
    const factor = r / rings;
    ctx.beginPath();
    labels.forEach((_, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * factor;
      const y = centerY + Math.sin(angle) * radius * factor;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();
  }

  labels.forEach((label, i) => {
    const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const tx = centerX + Math.cos(angle) * (radius + 22);
    const ty = centerY + Math.sin(angle) * (radius + 22);
    axisPoints.push({ label, x, y, tx, ty, angle, index: i });

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();

    ctx.fillStyle = '#c7d9f4';
    ctx.font = '11px Inter';
    ctx.textAlign = tx < centerX - 10 ? 'right' : tx > centerX + 10 ? 'left' : 'center';
    ctx.fillText(label, tx, ty);
  });

  series.slice(0, 3).forEach((entry) => {
    ctx.beginPath();
    entry.values.forEach((value, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const normalized = Math.max(0, Math.min(1, value / 5));
      const x = centerX + Math.cos(angle) * radius * normalized;
      const y = centerY + Math.sin(angle) * radius * normalized;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = entry.fill;
    ctx.strokeStyle = entry.stroke;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    entry.values.forEach((value, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const normalized = Math.max(0, Math.min(1, value / 5));
      const x = centerX + Math.cos(angle) * radius * normalized;
      const y = centerY + Math.sin(angle) * radius * normalized;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = entry.stroke;
      ctx.fill();
    });
  });

  return axisPoints;
}

export function findAxisHit(axisPoints, clickX, clickY) {
  return axisPoints.find((axis) => {
    const dx = axis.tx - clickX;
    const dy = axis.ty - clickY;
    return Math.sqrt(dx * dx + dy * dy) < 28;
  }) || null;
}
