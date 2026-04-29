const STATUS_COLOR = {
  normal: '#3fb950',
  disconnected: '#d29922',
  warning: '#f85149'
};

function Tooltip({ tooltip, lang }) {
  if (!tooltip) {
    return null;
  }

  return (
    <div id="tooltip" style={{ left: tooltip.x, top: tooltip.y, display: 'block' }}>
      <div className="sn">{tooltip.data.name}</div>
      <div>
        {lang === 'vi' ? 'Trạng thái' : 'Status'}:{' '}
        <b style={{ color: STATUS_COLOR[tooltip.data.status] || STATUS_COLOR.normal }}>
          {tooltip.data.status.toUpperCase()}
        </b>
      </div>
      <div>{lang === 'vi' ? 'Nhiệt độ' : 'Temp'}: {tooltip.data.temp} C</div>
      <div>{lang === 'vi' ? 'Áp suất' : 'Pressure'}: {tooltip.data.pres} kPa</div>
      <div>{lang === 'vi' ? 'Độ rung' : 'Vibration'}: {tooltip.data.vib} mm/s</div>
    </div>
  );
}

export default Tooltip;
