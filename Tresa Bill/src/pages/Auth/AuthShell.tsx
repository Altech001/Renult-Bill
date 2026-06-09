import SEO from "@/components/SEO";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

interface AuthShellProps {
  title: string;
  subtitle: string;
  seoTitle: string;
  path: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthShell({ title, subtitle, seoTitle, path, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 font-sans relative overflow-hidden">
      <Helmet>
        <link rel="preload" as="image" href="/bg/bg.png" />
      </Helmet>
      <SEO title={seoTitle} path={path} />
      <img src="/bg/bg.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.04] blur-sm pointer-events-none select-none z-0" />

      <div className="w-full max-w-[380px] flex flex-col items-center z-10 pb-16">
        <Link to="/" className="mx-auto w-12 h-12 flex items-center justify-center mb-3">
          <img src="/logo.png" alt="Renult" className="w-10 h-10 object-contain" />
        </Link>
        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-slate-800 mb-1">{title}</h1>
          <p className="text-[13px] text-slate-500">{subtitle}</p>
        </div>
        {children}
        {footer}
      </div>

      <div className="absolute bottom-6 flex flex-wrap items-center justify-center gap-6 text-[10px] text-slate-500 font-bold w-full px-4">
        <span>Renult © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
