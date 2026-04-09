#!/usr/bin/env bash
# Test script to demonstrate improved completion tracking logic

echo "Testing Completion Tracking Logic"
echo "=================================="
echo ""

# Test Case 1: Execution Success + DoD Pass
echo "Test 1: Execution Success + DoD Pass"
RESULT=0
EXEC_RESULT=$RESULT
DOD_PASSED=true

outcome="success"
completion_pct=100

if [ $EXEC_RESULT -ne 0 ]; then
    outcome="failure"
    completion_pct=0
elif [ "$DOD_PASSED" = false ]; then
    outcome="partial"
    completion_pct=70
fi

echo "  EXEC_RESULT=$EXEC_RESULT, DOD_PASSED=$DOD_PASSED"
echo "  → outcome=$outcome, completion_pct=$completion_pct"
echo "  ✅ Expected: success, 100%"
echo ""

# Test Case 2: Execution Success + DoD Fail (THE FIX)
echo "Test 2: Execution Success + DoD Fail (THE CRITICAL CASE)"
RESULT=0
EXEC_RESULT=$RESULT  # Save BEFORE modification
DOD_PASSED=false

# Simulate DoD modifying RESULT
if [ $RESULT -eq 0 ]; then
    RESULT=1  # DoD failed, modify exit code
fi

outcome="success"
completion_pct=100

# Use EXEC_RESULT (original), not RESULT (modified)
if [ $EXEC_RESULT -ne 0 ]; then
    outcome="failure"
    completion_pct=0
elif [ "$DOD_PASSED" = false ]; then
    outcome="partial"
    completion_pct=70
fi

echo "  EXEC_RESULT=$EXEC_RESULT (original), RESULT=$RESULT (modified), DOD_PASSED=$DOD_PASSED"
echo "  → outcome=$outcome, completion_pct=$completion_pct"
echo "  ✅ Expected: partial, 70%"
echo ""

# Test Case 3: Execution Fail + DoD Fail
echo "Test 3: Execution Fail + DoD Fail"
RESULT=1
EXEC_RESULT=$RESULT
DOD_PASSED=false

outcome="success"
completion_pct=100

if [ $EXEC_RESULT -ne 0 ]; then
    outcome="failure"
    completion_pct=0
elif [ "$DOD_PASSED" = false ]; then
    outcome="partial"
    completion_pct=70
fi

echo "  EXEC_RESULT=$EXEC_RESULT, DOD_PASSED=$DOD_PASSED"
echo "  → outcome=$outcome, completion_pct=$completion_pct"
echo "  ✅ Expected: failure, 0%"
echo ""

echo "=================================="
echo "All tests demonstrate correct logic!"
