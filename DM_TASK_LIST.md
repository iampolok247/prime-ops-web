# Digital Marketing Executive - Daily Task Checklist

## Default Task List (15 Tasks)

This document contains the default daily tasks for the Digital Marketing Executive role. These tasks are automatically created each day.

### Social Media Management (Tasks 1-5)
1. **Check and respond to all social media messages** (Facebook, Instagram, LinkedIn)
   - Check all message inboxes
   - Respond within 2 hours
   - Forward important messages to relevant departments

2. **Review and respond to comments on all social media posts**
   - Facebook page comments
   - Instagram post comments
   - LinkedIn post comments
   - Engage with positive comments
   - Address concerns professionally

3. **Post daily content on Facebook Business Page**
   - Ensure daily post is scheduled/published
   - Check post performance
   - Engage with early comments

4. **Post daily content on Instagram**
   - Regular feed post or story
   - Use relevant hashtags
   - Check engagement metrics

5. **Post daily content on LinkedIn**
   - Company page update
   - Professional content
   - Industry-relevant posts

### Paid Advertising (Tasks 6-7)
6. **Check Google Ads campaigns and performance**
   - Review daily spend
   - Check click-through rates
   - Monitor conversions
   - Pause underperforming ads

7. **Check Facebook Ads campaigns and performance**
   - Review ad spend
   - Check reach and engagement
   - Monitor lead quality
   - Adjust targeting if needed

### Analytics & Monitoring (Task 8)
8. **Monitor website traffic and analytics**
   - Google Analytics dashboard
   - Check bounce rate
   - Review top pages
   - Monitor conversion funnel

### Communication (Task 9)
9. **Check and respond to email inquiries**
   - Check company email
   - Respond to customer inquiries
   - Forward to relevant teams
   - Update CRM if needed

### SEO Management (Task 10)
10. **Update SEO keywords and meta descriptions if needed**
    - Review current rankings
    - Update underperforming pages
    - Research new keywords
    - Optimize content

### Content Planning (Tasks 11-12)
11. **Research trending topics and hashtags for tomorrow**
    - Check industry trends
    - Research relevant hashtags
    - Note viral content ideas
    - Plan content themes

12. **Create content calendar for next day**
    - Schedule posts for tomorrow
    - Prepare content and images
    - Write captions
    - Plan posting times

### Competitive Analysis (Task 13)
13. **Check competitor social media activities**
    - Monitor competitor posts
    - Note engagement levels
    - Identify successful strategies
    - Look for gaps/opportunities

### Reporting (Task 14)
14. **Submit daily work report to supervisor**
    - Summarize daily activities
    - Report key metrics
    - Highlight issues/achievements
    - Share insights

### Lead Management (Task 15)
15. **Follow up on pending leads from website/social media**
    - Check new lead submissions
    - Follow up on yesterday's leads
    - Update lead status in CRM
    - Pass qualified leads to sales

---

## How to Modify Tasks

If you need to customize the task list, edit the file:
`/Users/jrpolok/prime-ops-api/models/DMDailyChecklist.js`

Look for the `defaultTasks` array in the `getOrCreateToday` method:

```javascript
const defaultTasks = [
  { task: 'Your custom task here', order: 1 },
  { task: 'Another custom task', order: 2 },
  // ... add more tasks
];
```

### Adding New Tasks
1. Add a new object to the `defaultTasks` array
2. Set the `task` property with the task description
3. Set the `order` property with a unique number
4. Restart the API server
5. New checklists will use the updated tasks

### Removing Tasks
1. Remove the task object from the array
2. Restart the API server
3. Note: Existing checklists won't be affected, only new ones

### Reordering Tasks
1. Change the `order` property values
2. Tasks will display in ascending order
3. Restart the API server

---

## Task Categories

### High Priority (Must Do Daily)
- Social media messages and comments (Tasks 1-2)
- Daily content posting (Tasks 3-5)
- Email responses (Task 9)
- Daily report submission (Task 14)

### Medium Priority (Monitor & Optimize)
- Paid ads monitoring (Tasks 6-7)
- Website analytics (Task 8)
- SEO updates (Task 10)
- Lead follow-ups (Task 15)

### Planning & Strategy (Important)
- Content planning (Tasks 11-12)
- Competitor analysis (Task 13)

---

## Tips for Using the Checklist

### Morning Routine (9:00 AM - 10:00 AM)
✅ Check social media messages (Task 1)
✅ Respond to comments (Task 2)
✅ Check paid ads performance (Tasks 6-7)
✅ Monitor website analytics (Task 8)

### Midday Tasks (10:00 AM - 2:00 PM)
✅ Post daily content (Tasks 3-5)
✅ Respond to emails (Task 9)
✅ Follow up on leads (Task 15)

### Afternoon Planning (2:00 PM - 4:00 PM)
✅ Update SEO if needed (Task 10)
✅ Research trends and hashtags (Task 11)
✅ Create next day's content calendar (Task 12)
✅ Check competitor activities (Task 13)

### End of Day (4:00 PM - 5:00 PM)
✅ Submit daily report (Task 14)
✅ Final check on social media
✅ Review completion percentage

---

## Success Metrics

### Daily Target
- Complete **at least 80%** of tasks daily
- Aim for **100%** completion 5 days per week

### Weekly Target
- **3-4 perfect days** (100% completion)
- Average **85%+ completion rate**

### Monthly Target
- Consistent task completion
- No zero-completion days
- Improvement trend visible in reports

---

**Document Version**: 1.0
**Last Updated**: February 15, 2026
