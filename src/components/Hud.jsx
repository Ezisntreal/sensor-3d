function Hud({
  loading,
  lang,
  text,
  showSensors,
  wireframe,
  waterAnim,
  fogOn,
  reservoirLevel,
  downstreamLevel,
  sensorSummary,
  onToggleSensors,
  onToggleWireframe,
  onToggleWaterAnim,
  onToggleFog,
  onToggleLang
}) {
  return (
    <>
      <div id="loading" className={loading ? '' : 'hidden'}>
        <div className="spinner" />
        <div>Initializing Hydropower Dam...</div>
      </div>

      <div id="ui">
        <button className={`btn ${showSensors ? 'active' : ''}`} onClick={onToggleSensors}>
          {`Sensors: ${showSensors ? text.on : text.off}`}
        </button>
        <button className={`btn ${wireframe ? 'active' : ''}`} onClick={onToggleWireframe}>
          {`${text.wire}: ${wireframe ? text.on : text.off}`}
        </button>
        <button className={`btn ${waterAnim ? 'active' : ''}`} onClick={onToggleWaterAnim}>
          {`${text.wave}: ${waterAnim ? text.on : text.off}`}
        </button>
        <button className={`btn ${fogOn ? 'active' : ''}`} onClick={onToggleFog}>
          {`${text.fog}: ${fogOn ? text.on : text.off}`}
        </button>
        <button className="btn" onClick={onToggleLang}>
          {`Language: ${text.langButton}`}
        </button>
      </div>

      <div id="info">
        <h3>{text.infoTitle}</h3>
        <div>{text.dam}</div>
        <div>{lang === 'vi' ? `Mực nước hồ: ${reservoirLevel.toFixed(1)} m` : `Reservoir level: ${reservoirLevel.toFixed(1)} m`}</div>
        <div>{text.cap}</div>
        <div>{lang === 'vi' ? `Mực nước hạ lưu: ${downstreamLevel} m` : `Downstream water level: ${downstreamLevel} m`}</div>
        <div>{text.rain}</div>
        <div>{text.gate}</div>
        <hr />
        <div>{text.sensorSummary(sensorSummary.active, sensorSummary.total)}</div>
        <div>{text.warningSummary(sensorSummary.warning)}</div>
      </div>

      <div id="legend">
        <div id="lg-title">{text.statusTitle}</div>
        <div className="lg"><div className="ld normal" /> {text.normal}</div>
        <div className="lg"><div className="ld disconnected" /> {text.disconnected}</div>
        <div className="lg"><div className="ld critical" /> {text.critical}</div>
      </div>

      <div id="bar">{text.bar}</div>
    </>
  );
}

export default Hud;
