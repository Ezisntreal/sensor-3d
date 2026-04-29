import { useEffect, useMemo, useState } from 'react';
import HydroScene from './components/HydroScene';
import Hud from './components/Hud';
import Tooltip from './components/Tooltip';

const I18N = {
  en: {
    sensors: 'Sensors',
    wire: 'Wireframe',
    wave: 'Water Anim',
    fog: 'Fog',
    on: 'ON',
    off: 'OFF',
    bar: 'Hydropower Plant - Interactive 3D Simulation',
    infoTitle: 'Current Data',
    dam: 'Dam elevation: 160 m',
    cap: 'Reservoir capacity: 34.6 million m3',
    rain: 'Current rainfall: 0 mm',
    gate: 'Gate opening: 23 cm',
    statusTitle: 'Status',
    normal: 'Normal',
    disconnected: 'Disconnected',
    critical: 'Threshold alert',
    langButton: 'Tiếng Việt',
    sensorSummary: (active, total) => `Sensors: ${active}/${total} active`,
    warningSummary: count => `Warning: ${count} sensor`
  },
  vi: {
    sensors: 'Hiển thị cảm biến',
    wire: 'Khung dây',
    wave: 'Dòng chảy hạ lưu',
    fog: 'Sương mù',
    on: 'BẬT',
    off: 'TẮT',
    bar: 'Nhà máy thủy điện - Mô phỏng 3D',
    infoTitle: 'Dữ liệu hiện tại',
    dam: 'Cao trình đập: 160 m',
    cap: 'Dung tích hồ: 34.6 triệu m3',
    rain: 'Lượng mưa hiện tại: 0 mm',
    gate: 'Độ mở cống: 23 cm',
    statusTitle: 'Trạng thái',
    normal: 'Bình thường',
    disconnected: 'Mất kết nối',
    critical: 'Cảnh báo vượt ngưỡng',
    langButton: 'English',
    sensorSummary: (active, total) => `Cảm biến: ${active}/${total} hoạt động`,
    warningSummary: count => `Cảnh báo: ${count} cảm biến`
  }
};

function App() {
  const [showSensors, setShowSensors] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [waterAnim, setWaterAnim] = useState(true);
  const [fogOn, setFogOn] = useState(true);
  const [uiLang, setUiLang] = useState('vi');
  const [loading, setLoading] = useState(true);
  const [reservoirLevel] = useState(112.3);
  const [downstreamLevel] = useState(8);
  const [tooltip, setTooltip] = useState(null);
  const [sensorSummary, setSensorSummary] = useState({ active: 4, total: 5, warning: 1 });

  const t = useMemo(() => I18N[uiLang], [uiLang]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-root">
      <HydroScene
        showSensors={showSensors}
        wireframe={wireframe}
        waterAnim={waterAnim}
        fogOn={fogOn}
        onSensorSelect={setTooltip}
        onPointerMissed={() => setTooltip(null)}
        onSensorSummaryChange={setSensorSummary}
      />

      <Hud
        loading={loading}
        lang={uiLang}
        text={t}
        showSensors={showSensors}
        wireframe={wireframe}
        waterAnim={waterAnim}
        fogOn={fogOn}
        reservoirLevel={reservoirLevel}
        downstreamLevel={downstreamLevel}
        sensorSummary={sensorSummary}
        onToggleSensors={() => {
          setShowSensors(v => !v);
          setTooltip(null);
        }}
        onToggleWireframe={() => setWireframe(v => !v)}
        onToggleWaterAnim={() => setWaterAnim(v => !v)}
        onToggleFog={() => setFogOn(v => !v)}
        onToggleLang={() => setUiLang(v => (v === 'en' ? 'vi' : 'en'))}
      />

      <Tooltip lang={uiLang} tooltip={tooltip} />
    </div>
  );
}

export default App;
