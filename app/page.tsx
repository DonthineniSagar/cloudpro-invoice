import Link from "next/link";
import { FileText, Users, TrendingUp, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg" />
              <span className="text-xl font-bold text-gray-900">CloudPro</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional Invoicing
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create, send, and track invoices in minutes. Get paid faster with CloudPro's modern invoicing platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold border border-gray-300 rounded-xl shadow-sm hover:shadow transition-all duration-200"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to get paid
          </h2>
          <p className="text-lg text-gray-600">
            Powerful features designed for modern businesses
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: FileText,
              title: "Professional Invoices",
              description: "Create beautiful, branded invoices in seconds",
              color: "from-primary-500 to-primary-600",
            },
            {
              icon: Users,
              title: "Client Management",
              description: "Keep track of all your clients in one place",
              color: "from-secondary-500 to-secondary-600",
            },
            {
              icon: TrendingUp,
              title: "Real-time Analytics",
              description: "Track revenue, payments, and business growth",
              color: "from-success-500 to-success-600",
            },
            {
              icon: Zap,
              title: "Fast Payments",
              description: "Get paid faster with integrated payment links",
              color: "from-warning-500 to-warning-600",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-200 border border-gray-100"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-primary-600 to-secondary-600 rounded-3xl p-12 text-center shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of businesses using CloudPro
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-white hover:bg-gray-50 text-primary-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-600">
            <p>&copy; 2026 CloudPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
