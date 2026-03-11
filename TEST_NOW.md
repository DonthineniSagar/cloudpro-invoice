# 🎉 Ready to Test!

## Open 2 Terminals

### Terminal 1 - AWS Sandbox
```bash
cd /Users/sdonthineni/projects/cloudpro-invoice
npm run sandbox
```
**Keep this running** - it syncs your AWS backend

---

### Terminal 2 - Frontend
```bash
cd /Users/sdonthineni/projects/cloudpro-invoice
npm run dev
```
Then visit: **http://localhost:3000**

---

## What to Test

### 1. Sign Up (Real AWS Cognito)
- Click "Sign up"
- Email: `test@example.com`
- Password: `Test1234!` (min 8 chars)
- Should create account and redirect to dashboard

### 2. Company Profile (Real DynamoDB)
- Click "Set Up Company Profile"
- Fill in:
  - Company Name: "Test Company"
  - GST Number: "12-345-678"
  - Bank Account: "12-3456-7890123-00"
- Click "Save Profile"
- Data saved to DynamoDB!

### 3. Sign Out & Back In
- Click "Sign out"
- Sign in with same credentials
- Your data persists!

---

## What's Working

✅ **Real AWS Cognito** - User authentication  
✅ **Real DynamoDB** - Company profile storage  
✅ **Owner Authorization** - Users see only their data  
✅ **Sydney Region** - ap-southeast-2  
✅ **Modern UI** - Indigo theme, clean design  

---

## Next Steps (Day 2 Continued)

After testing, we'll add:
- User profile (firstName, lastName)
- Client management
- Invoice creation

---

**Everything is connected to real AWS!** 🚀
