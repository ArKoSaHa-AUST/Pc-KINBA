import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Cpu, Shield, Zap, Box } from 'lucide-react';

const compatibilityData = [
  {
    component: 'CPU',
    name: 'Ryzen 5 7600X / Core i5-13600K',
    status: 'optimal',
    icon: <Cpu className="w-6 h-6" />,
  },
  {
    component: 'Motherboard',
    name: 'PCIe 4.0 x16 Slot Required',
    status: 'compatible',
    icon: <Shield className="w-6 h-6" />,
  },
  {
    component: 'Power Supply',
    name: 'Minimum 550W (650W Recommended)',
    status: 'warning',
    icon: <Zap className="w-6 h-6" />,
  },
  {
    component: 'Case',
    name: 'Max GPU Length: 280mm',
    status: 'optimal',
    icon: <Box className="w-6 h-6" />,
  },
];

export default function Compatibility() {
  return (
    <section className="py-[100px] lg:py-[140px]">
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div>
            <h2 className="text-title mb-4">Compatibility Check</h2>
            <p className="text-subtitle max-w-2xl">
              Ensure this component fits perfectly with your current or planned build.
            </p>
          </div>
          <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-semibold transition-all border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 shadow-lg">
            Check My Build
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {compatibilityData.map((item, idx) => {
            let statusStyle = '';
            let StatusIcon;

            if (item.status === 'optimal') {
              statusStyle =
                'border-green-500/30 bg-green-500/5 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.1)]';
              StatusIcon = CheckCircle2;
            } else if (item.status === 'compatible') {
              statusStyle =
                'border-cyan-500/30 bg-cyan-500/5 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]';
              StatusIcon = CheckCircle2;
            } else if (item.status === 'warning') {
              statusStyle =
                'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.1)]';
              StatusIcon = AlertTriangle;
            } else {
              statusStyle =
                'border-red-500/30 bg-red-500/5 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]';
              StatusIcon = XCircle;
            }

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`p-8 lg:p-10 rounded-[24px] border ${statusStyle} flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300 backdrop-blur-xl`}
              >
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-[16px] bg-white/5 text-white border border-white/10 group-hover:border-white/20 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-gray-400 text-sm font-semibold mb-1 uppercase tracking-wider">
                      {item.component}
                    </h4>
                    <p className="text-white text-lg font-medium">{item.name}</p>
                  </div>
                </div>
                <StatusIcon className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
