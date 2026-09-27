# CPS GUI Date-Time Picker - Quick Reference

## What Changed?

### OLD INTERFACE (4 separate inputs) ❌
```
┌────────────────────────────────────────────────────────────┐
│ Step 1: Select Parking Time                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Start Date     Start Time     End Date       End Time    │
│  [________]     [________]     [________]     [________]   │
│  2025-11-30     14:30          2025-11-30     16:30       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### NEW INTERFACE (2 unified pickers) ✅
```
┌────────────────────────────────────────────────────────────┐
│ Step 1: Select Parking Time                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Start Date & Time              End Date & Time           │
│  [November 30, 2025 2:30 PM]    [November 30, 2025 4:30 PM] │
│       ↓ Click opens calendar + time selector ↓             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Features of the New Date-Time Picker

### When you click on the input:

```
┌─────────────────────────────────────────────────┐
│              November 2025            ◄  ►     │
├─────────────────────────────────────────────────┤
│  Sun  Mon  Tue  Wed  Thu  Fri  Sat             │
│                              1    2             │
│   3    4    5    6    7    8    9             │
│  10   11   12   13   14   15   16             │
│  17   18   19   20   21   22   23             │
│  24   25   26   27   28  [29]  30             │ <- Calendar
├─────────────────────────────────────────────────┤
│  Time:                                         │
│  ┌──────────────┐                              │
│  │  12:00 PM    │                              │
│  │  12:15 PM    │                              │
│  │  12:30 PM    │                              │
│  │  12:45 PM    │                              │ <- Time List
│  │ [02:30 PM]   │  ← Selected                  │
│  │  02:45 PM    │                              │
│  │  03:00 PM    │                              │
│  └──────────────┘                              │
└─────────────────────────────────────────────────┘
```

## How to Use

### Step-by-Step Guide:

1. **Click** on "Start Date & Time" field
2. **Select** your date from the calendar (November 30, 2025)
3. **Scroll** through the time list on the right
4. **Click** on your desired time (e.g., 2:30 PM)
5. **Repeat** for "End Date & Time"
6. **Proceed** to select your parking zone and spot

### Smart Features:

🎯 **Time Intervals**: Shows times in 15-minute increments
   - 12:00 PM, 12:15 PM, 12:30 PM, 12:45 PM...

📅 **Date Validation**: 
   - Cannot select past dates
   - End date starts from your selected start date

⏰ **Visual Feedback**:
   - Selected date highlighted in blue
   - Today's date has yellow background
   - Hover effects on all clickable elements

📱 **Mobile Friendly**:
   - Touch-optimized interface
   - Responsive layout
   - Easy to use on small screens

## Example Scenarios

### Scenario 1: Quick 2-Hour Parking
1. Click "Start Date & Time"
2. Select today + 2:00 PM
3. Click "End Date & Time"  
4. Select today + 4:00 PM
5. ✅ Done!

### Scenario 2: Overnight Parking
1. Click "Start Date & Time"
2. Select today + 8:00 PM
3. Click "End Date & Time"
4. Select tomorrow + 8:00 AM
5. ✅ Done!

### Scenario 3: Full Day Parking
1. Click "Start Date & Time"
2. Select tomorrow + 8:00 AM
3. Click "End Date & Time"
4. Select tomorrow + 6:00 PM
5. ✅ Done!

## Color Coding

- 🔵 **Blue**: Selected date/time
- 🟡 **Yellow**: Today's date
- ⚪ **White**: Available dates
- 🔘 **Gray**: Past dates (disabled)
- 🟦 **Light Blue**: Hover state

## Keyboard Shortcuts

- **Arrow Keys**: Navigate through calendar dates
- **Enter**: Select highlighted date
- **Escape**: Close the picker
- **Tab**: Move between date and time
- **Page Up/Down**: Change months

## Tips for Best Experience

✨ **Pro Tips**:
1. The picker remembers your selection as you navigate
2. You can change months using the arrow buttons
3. Time list auto-scrolls to current time
4. Click outside the picker to close it
5. Format displays as: "Month Day, Year Hour:Minute AM/PM"

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Number of inputs | 4 fields | 2 pickers |
| User actions | 4 clicks + typing | 2 clicks |
| Error prone | High | Low |
| Mobile friendly | Poor | Excellent |
| Visual clarity | Confusing | Clear |
| Time to complete | ~30 seconds | ~10 seconds |

## Need Help?

If you encounter any issues:
1. Make sure your browser is up to date
2. Clear browser cache if picker doesn't appear
3. Check console for any error messages
4. Try refreshing the page

## Technical Notes

- Uses `react-datepicker` v8.4.0
- Time intervals: Every 15 minutes
- Date format: "MMMM d, yyyy h:mm aa"
- Timezone: Local system timezone
- Validation: Built-in
