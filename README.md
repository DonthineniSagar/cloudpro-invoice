# CloudPro Invoice

Modern, professional invoicing platform built with Next.js 14, AWS Amplify Gen 2, and a beautiful design system.

## 🚀 Features

- **Professional Invoicing** - Create beautiful, branded invoices in seconds
- **Client Management** - Keep track of all your clients in one place
- **Real-time Analytics** - Track revenue, payments, and business growth
- **Fast Payments** - Get paid faster with integrated payment links
- **Modern UI** - Clean, intuitive interface with modern design system
- **Secure** - Built on AWS with proper authentication and authorization

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: AWS Amplify Gen 2
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3
- **Auth**: AWS Cognito
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+
- AWS Account
- npm or yarn

## 🏃 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/cloudpro-invoice.git
cd cloudpro-invoice
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up AWS Amplify

```bash
npx ampx sandbox
```

This will:
- Create AWS resources in your account
- Generate `amplify_outputs.json` with your configuration
- Start a local development environment

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
cloudpro-invoice/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
├── lib/                   # Utility functions and helpers
├── amplify/              # AWS Amplify backend
│   ├── auth/             # Authentication configuration
│   ├── data/             # Data schema (DynamoDB)
│   ├── storage/          # Storage configuration (S3)
│   └── backend.ts        # Backend configuration
├── BACKLOG.md            # Product backlog and roadmap
└── DESIGN_SYSTEM.md      # Design system documentation
```

## 🎨 Design System

This project uses a modern design system with:
- **Primary Color**: Indigo (#6366F1)
- **Secondary Color**: Purple (#A855F7)
- **Clean Typography**: System fonts with proper hierarchy
- **Consistent Spacing**: 4px base unit
- **Modern Components**: Built with Tailwind CSS

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for full documentation.

## 📝 Development Roadmap

See [BACKLOG.md](./BACKLOG.md) for:
- Feature backlog
- Technical debt items
- Security improvements
- UI/UX enhancements

## 🚢 Deployment

### Deploy to AWS Amplify Hosting

```bash
npx ampx pipeline-deploy --branch main --app-id <your-app-id>
```

### Deploy to Vercel

```bash
vercel deploy
```

Make sure to add your `amplify_outputs.json` configuration to your deployment environment.

## 🔐 Environment Variables

Create a `.env.local` file:

```env
# AWS Amplify (auto-generated from amplify_outputs.json)
# No manual configuration needed

# Optional: Stripe for payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## 📊 Data Migration

If migrating from the old invoice-generator:

1. Export data from old DynamoDB tables
2. Run migration script (coming soon)
3. Import to new tables
4. Update S3 file references

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Design inspiration from modern SaaS applications
- Built with [Next.js](https://nextjs.org/)
- Powered by [AWS Amplify](https://aws.amazon.com/amplify/)
- Icons by [Lucide](https://lucide.dev/)

---

**Launch Date**: April 1, 2026 (New Financial Year)
