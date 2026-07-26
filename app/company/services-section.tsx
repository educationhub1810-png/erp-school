import { ArrowRight, Bot, Cloud, Code2, PenTool, ShieldCheck, Smartphone } from "lucide-react";
import { Reveal } from "./reveal";

const SERVICES = [
  {
    num: "01",
    icon: Code2,
    name: "Web Development",
    desc: "Fast, scalable websites and web apps built with modern frameworks and clean architecture.",
  },
  {
    num: "02",
    icon: Smartphone,
    name: "Mobile App Development",
    desc: "Native and cross-platform apps designed for performance and a seamless user experience.",
  },
  {
    num: "03",
    icon: Cloud,
    name: "Cloud & DevOps",
    desc: "Cloud infrastructure, CI/CD pipelines, and automation that keep your systems reliable.",
  },
  {
    num: "04",
    icon: PenTool,
    name: "UI/UX Design",
    desc: "Interfaces people enjoy using — research-driven design that balances form and function.",
  },
  {
    num: "05",
    icon: Bot,
    name: "AI & Automation",
    desc: "Custom AI solutions and workflow automation that save time and unlock new capabilities.",
    featured: true,
  },
  {
    num: "06",
    icon: ShieldCheck,
    name: "IT Consulting & Security",
    desc: "Strategic guidance and security audits to keep your technology sound and future-ready.",
  },
];

export function ServicesSection() {
  return (
    <section className="bg-[#F5F8FC] py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-[2px] bg-[#035BD8]" />
              <span className="text-xs font-bold tracking-[0.15em] text-[#035BD8]">
                CHECK OUR SERVICES
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 leading-tight">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-[#00A5FD] to-[#035BD8] bg-clip-text text-transparent">
                build and scale
              </span>
            </h2>
          </div>
          <p className="text-gray-500 sm:text-right">
            From first prototype to full-scale product — we cover the entire journey.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((s, i) => (
            <Reveal key={s.name} delay={i * 60}>
              <div
                className={`group h-full rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 ${
                  s.featured
                    ? "bg-gradient-to-br from-[#151E3D] to-[#0A3D91] shadow-xl shadow-blue-900/20"
                    : "bg-white ring-1 ring-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/20 hover:bg-gradient-to-br hover:from-[#151E3D] hover:to-[#0A3D91]"
                }`}
              >
                <span
                  className={`text-sm font-bold transition-colors ${
                    s.featured ? "text-blue-300" : "text-[#035BD8] group-hover:text-blue-300"
                  }`}
                >
                  {s.num}
                </span>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mt-4 mb-5 shadow-md transition-colors ${
                    s.featured
                      ? "bg-white/10 shadow-black/10"
                      : "bg-gradient-to-br from-[#00A5FD] to-[#035BD8] shadow-blue-900/10 group-hover:bg-white/10"
                  }`}
                >
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <h3
                  className={`text-lg font-bold mb-2 transition-colors ${
                    s.featured ? "text-white" : "text-gray-900 group-hover:text-white"
                  }`}
                >
                  {s.name}
                </h3>
                <p
                  className={`text-sm leading-relaxed mb-5 transition-colors ${
                    s.featured ? "text-gray-300" : "text-gray-500 group-hover:text-gray-300"
                  }`}
                >
                  {s.desc}
                </p>
                <a
                  href="#contact"
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-all hover:translate-x-0.5 ${
                    s.featured ? "text-white" : "text-[#035BD8] group-hover:text-white"
                  }`}
                >
                  Learn more
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
