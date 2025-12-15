# Fix for Empty CSV and Visualization Issue

## Problem Statement
After running the guided analysis, users were getting empty CSV files and empty visualizations.

## Root Cause Analysis

### Issue 1: Export Button Always Enabled
The Export button in `AnalysisPlayground.tsx` was always enabled, even when no computation results existed. This allowed users to:
- Export CSV before computation started
- Export CSV if computation failed
- Export CSV immediately after navigation from NewAnalysis page

### Issue 2: No Validation in Export Process
The `ExportDialog` component didn't validate that `featureData` had content before attempting export:
- `generateCSV()` returns empty string when data array is empty
- No user feedback when trying to export empty data
- Download would create an empty file with just headers or completely empty

### Issue 3: Timing Issues in Guided Analysis Flow
Users creating analysis via guided mode would:
1. Complete hypothesis and panel selection
2. Click "Run Analysis" which creates DB record
3. Navigate to AnalysisPlayground with `autoStartComputation: true`
4. See Export button immediately (before computation runs)
5. Click Export and get empty file

## Solution Implemented

### 1. Disabled Export Button When No Data
**File**: `src/pages/AnalysisPlayground.tsx`
```typescript
<Button variant="outline" size="sm" disabled={featureData.length === 0}>
  <Download className="h-4 w-4 mr-2" />
  Export
</Button>
```
- Export button is now disabled when `featureData` is empty
- Visual indication to user that data is not yet available
- Prevents accidental export of empty data

### 2. Added Validation in Export Handler
**File**: `src/components/analysis/ExportDialog.tsx`

Added two levels of validation:

**Level 1: Pre-export validation**
```typescript
if (exportType === 'features' && featureData.length === 0) {
  toast({ 
    variant: 'destructive', 
    title: 'No data to export', 
    description: 'Please run the computation first to generate feature data.' 
  });
  return;
}
```

**Level 2: Post-generation validation**
```typescript
if (!csv || csv.trim().length === 0) {
  toast({ 
    variant: 'destructive', 
    title: 'No data to export', 
    description: 'The feature data is empty. Please run the computation first.' 
  });
  return;
}
```

### 3. Updated Export Dialog UI
**Changes**:
- Disabled "Feature Data" radio button when no data exists
- Shows message "No data available - run computation first" instead of count
- Disabled Download button when feature data is empty
- Provides clear user feedback about why export is not available

```typescript
<RadioGroupItem value="features" id="features" disabled={featureData.length === 0} />
<p className="text-sm text-muted-foreground">
  {featureData.length > 0 
    ? `${featureData.length} sequences × ${featureNames.length} features`
    : 'No data available - run computation first'}
</p>
```

```typescript
<Button 
  onClick={handleExport} 
  disabled={exporting || (exportType === 'features' && featureData.length === 0)}
>
```

## Testing Checklist

### Before Fix (Expected Issues)
- [ ] Create analysis via guided mode
- [ ] Navigate to AnalysisPlayground
- [ ] Click Export immediately (before computation)
- [ ] Result: Empty CSV file downloaded
- [ ] Result: Visualizations show "No data available"

### After Fix (Expected Behavior)
- [ ] Create analysis via guided mode
- [ ] Navigate to AnalysisPlayground
- [ ] Export button should be **disabled** (grayed out)
- [ ] Wait for computation to complete (auto-starts)
- [ ] Export button becomes **enabled**
- [ ] Click Export
- [ ] Open ExportDialog - should show sequence/feature count
- [ ] Click Download - should download CSV with actual data
- [ ] Verify CSV contains:
  - Header row with feature names
  - Data rows for each sequence
  - Actual computed values (not empty/null)

### Edge Cases to Test
1. **Manual mode**: Export button disabled until computation runs
2. **Failed computation**: Export button remains disabled, toast shows error
3. **Partial computation**: If computation stops early, existing data can be exported
4. **Empty sequences**: If no sequences loaded, export disabled with helpful message
5. **Dialog interaction**: Clicking "Feature Data" when disabled shows no interaction
6. **Citations export**: Should always work (not affected by feature data)

## User Experience Improvements

### Before
- 😕 User could export at any time
- 😕 Empty CSV downloaded with no warning
- 😕 No indication why data was empty
- 😕 Confusion about whether computation ran

### After  
- ✅ Export button clearly disabled when no data
- ✅ Helpful toast messages guide user
- ✅ UI shows "No data available - run computation first"
- ✅ Download button disabled with clear reasoning
- ✅ User understands they need to wait for computation

## Files Modified
1. `src/components/analysis/ExportDialog.tsx` - Added validation and UI updates
2. `src/pages/AnalysisPlayground.tsx` - Disabled export button when no data

## Related Components
- `src/lib/csvExport.ts` - CSV generation (already handles empty data correctly)
- `src/hooks/useFeatureExtraction.ts` - Feature computation hook
- `supabase/functions/extract-features/index.ts` - Backend computation

## Future Enhancements
1. Add progress indicator showing computation percentage
2. Show preview of data before export
3. Add export queue for large datasets
4. Implement partial export for incomplete computations
5. Add export format validation/preview

## Notes
- Visualizations already had proper "no data" states
- The main issue was the export functionality allowing empty exports
- Auto-start computation works correctly but users need visual feedback
- All changes are minimal and focused on UX improvements
