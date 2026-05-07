import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap, Shield, Users, ClipboardList, BarChart3, Clock, Star } from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white selection:bg-primary/30">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/20">
              Z
            </div>
            <span className="font-bold text-2xl tracking-tight hidden sm:block">Zenith</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            <Button asChild className="rounded-full px-6 bg-primary hover:bg-primary/90">
              <a href="/api/auth/discord">Login with Discord</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-24 px-6 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="container mx-auto text-center relative z-10">
          <Badge className="mb-6 py-1 px-4 bg-primary/10 text-primary border-primary/20 rounded-full text-sm font-semibold">
            v2.0 is now live 🚀
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            The Ultimate Staff Management <br className="hidden md:block" /> Bot for ERLC
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Zenith provides professional-grade tools for managing your ERLC Discord staff. From applications to analytics, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-8 text-lg h-14 bg-primary hover:bg-primary/90 group">
              <a href="/api/auth/discord">
                Get Started for Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-8 text-lg h-14 border-white/10 hover:bg-white/5">
              <a href="#">Join Discord Support</a>
            </Button>
          </div>
          <div className="mt-20 max-w-5xl mx-auto border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
             <img src="https://placehold.co/1200x675/111827/5865f2?text=Zenith+Dashboard+Preview" alt="Zenith Dashboard" className="w-full" />
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-[#090b10]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to lead.</h2>
            <p className="text-gray-400 text-lg">Powerful tools designed for ERLC server owners.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: ClipboardList, title: "Applications", desc: "Automate your hiring process with custom forms and multi-stage reviews." },
              { icon: Users, title: "Staff Roster", desc: "Keep track of every staff member, their rank, division, and join date." },
              { icon: Shield, title: "Strikes & Discipline", desc: "Fair and transparent disciplinary system with automated logging." },
              { icon: Clock, title: "LOA Management", desc: "Easily manage Leave of Absence requests and track staff availability." },
              { icon: Star, title: "Rank Tracking", desc: "Define your hierarchy and automate promotions based on performance." },
              { icon: BarChart3, title: "Analytics", desc: "Gain insights into staff activity and server performance metrics." },
            ].map((feature, i) => (
              <Card key={i} className="bg-[#0d1117] border-white/5 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing.</h2>
            <p className="text-gray-400 text-lg">Choose the plan that fits your server's needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="bg-[#0d1117] border-white/5 flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Free</CardTitle>
                <CardDescription className="text-gray-400">Perfect for starting communities</CardDescription>
                <div className="mt-4 text-4xl font-bold text-white">R$0<span className="text-lg font-normal text-gray-500">/mo</span></div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-4">
                  {[
                    "Applications system",
                    "Ranks (up to 5)",
                    "Basic Strikes system",
                    "LOA management",
                    "Basic configuration",
                    "Web dashboard access"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">Current Plan</Button>
              </div>
            </Card>

            {/* Premium Plan */}
            <Card className="bg-[#0d1117] border-primary/50 relative overflow-hidden flex flex-col shadow-2xl shadow-primary/10">
              <div className="absolute top-0 right-0 p-3">
                <Badge className="bg-amber-500 text-black border-none font-bold">PREMIUM</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-white">Premium ✨</CardTitle>
                <CardDescription className="text-gray-400">For established professional servers</CardDescription>
                <div className="mt-4 text-4xl font-bold text-white">R$300<span className="text-lg font-normal text-gray-500">/mo</span></div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-4">
                  {[
                    "Unlimited ranks & divisions",
                    "Activity tracking & Analytics",
                    "Multi-stage hiring process",
                    "Custom bot branding",
                    "Meeting scheduler",
                    "Performance reviews",
                    "Custom application forms"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300">
                      <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full bg-primary hover:bg-primary/90">Upgrade Now</Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-[#090b10]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Start managing in minutes.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "Invite Zenith", desc: "Add our bot to your Discord server with a few clicks." },
              { step: "02", title: "Configure Settings", desc: "Set up your ranks, divisions, and channels on the dashboard." },
              { step: "03", title: "Manage Staff", desc: "Everything is ready! Start managing your team professionally." },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-6xl font-black text-white/5 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="container mx-auto px-6 flex flex-col md:row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold">Z</div>
            <span className="font-bold text-lg">Zenith</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Zenith Bot. Not affiliated with Roblox or ERLC.</p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Discord</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
