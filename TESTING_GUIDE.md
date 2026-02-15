# Quick Testing Guide - DM Daily Checklist

## 🚀 Local Testing (Current)

Your development servers are running:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:5001

## ✅ Test Steps

### 1. Login
- Open http://localhost:5173 in your browser
- Login with a Digital Marketing role account
  - If you don't have one, check the seeded users in the database

### 2. Access Daily Checklist
- Look at the left sidebar
- Click on "Daily Checklist" (with checkbox icon)
- You should see:
  - ✅ 15 predefined tasks
  - ✅ Progress bar at 0%
  - ✅ Today's date displayed

### 3. Test Task Completion
- Click on any task's circle icon
- It should:
  - ✅ Turn green with a checkmark
  - ✅ Show strikethrough on task text
  - ✅ Display completion time
  - ✅ Update progress bar
  - ✅ Update percentage

### 4. Test Task Uncompleting
- Click on a completed task (green checkmark)
- It should:
  - ✅ Return to empty circle
  - ✅ Remove strikethrough
  - ✅ Remove completion time
  - ✅ Update progress bar and percentage

### 5. Test Reports Page
- Click on "Checklist Reports" in sidebar
- You should see:
  - ✅ Statistics cards (Total Days, Avg Completion, etc.)
  - ✅ Date range filters
  - ✅ Table with historical data
  - ✅ Export CSV button (if data exists)

### 6. Test Date Filters
- Change the "From" and "To" dates
- Click "Refresh"
- Verify the table updates with filtered data

### 7. Test CSV Export
- If you have some data in reports
- Click "Export CSV" button
- Check that a CSV file downloads
- Open it and verify the data is correct

## 🔍 Verify in Browser Console

Open browser DevTools (F12) and check:
1. **Network Tab**: API calls should return 200 OK
   - `/api/dm/daily-checklist`
   - `/api/dm/daily-checklist/toggle`
   - `/api/dm/daily-checklist/reports`

2. **Console Tab**: Should have no errors

## 📊 Check Database (Optional)

If you want to verify the data in MongoDB:

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use primeops

# Check if checklist was created
db.dmdailychecklists.find().pretty()

# Check specific user's checklist
db.dmdailychecklists.find({date: "2026-02-15"}).pretty()
```

## 🐛 Common Issues

### Issue: "404 Not Found" on API calls
**Solution**: Make sure API server is running on port 5001
```bash
cd /Users/jrpolok/prime-ops-api
node server.js
```

### Issue: "Unauthorized" error
**Solution**: Make sure you're logged in with a Digital Marketing role account

### Issue: Sidebar menu items not showing
**Solution**: 
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R on Mac)
3. Check that you're logged in with DigitalMarketing role

### Issue: Tasks not saving
**Solution**:
1. Check browser console for errors
2. Verify MongoDB is connected (check API terminal output)
3. Check network tab for failed API calls

## ✨ Expected Behavior

### First Visit
- Creates a new checklist for today
- All 15 tasks are unchecked
- Progress shows 0%

### Subsequent Visits (Same Day)
- Loads existing checklist for today
- Shows previously completed tasks as checked
- Progress shows correct percentage

### Next Day
- Automatically creates a new checklist
- Previous day's data is saved to history
- All tasks are unchecked again

## 📝 Test Checklist

- [ ] Login successful
- [ ] Daily Checklist page loads
- [ ] All 15 tasks are visible
- [ ] Can mark tasks as complete
- [ ] Progress bar updates correctly
- [ ] Can unmark completed tasks
- [ ] Completion percentage is accurate
- [ ] Completion time is displayed
- [ ] Reports page loads
- [ ] Statistics cards show correct data
- [ ] Date filters work
- [ ] Table displays historical data
- [ ] CSV export works
- [ ] No console errors
- [ ] Mobile responsive design works

## 🎯 Next Steps

After local testing is successful:

1. **Commit Changes**
   ```bash
   cd /Users/jrpolok/prime-ops-web
   git add .
   git commit -m "Add Daily Checklist feature for Digital Marketing role"
   git push origin main
   
   cd /Users/jrpolok/prime-ops-api
   git add .
   git commit -m "Add Daily Checklist API endpoints and model"
   git push origin main
   ```

2. **Deploy to Production**
   - Follow the deployment steps in DAILY_CHECKLIST_IMPLEMENTATION.md
   - Or trigger Jenkins build if using CI/CD

3. **Test on Production**
   - Verify everything works on the live server
   - Check with actual Digital Marketing users

---

**Happy Testing! 🚀**

If you encounter any issues, check the DAILY_CHECKLIST_IMPLEMENTATION.md file for detailed troubleshooting.
