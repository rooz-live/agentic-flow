use rust_core::portfolio::services::{BudgetGuardrail, WsjfItem, Horizon, WsjfCalculator};
use rust_decimal_macros::dec;

#[test]
fn test_budget_guardrail_allocation() {
    let calculator = WsjfCalculator::new();

    // Create items with varying scores and sizes
    let mut items = vec![
        calculator.calculate("1", "Critical Fix", dec!(10), dec!(10), dec!(10), dec!(1), Some("Production outage")).unwrap(), // Score 30.0, Size 1
        calculator.calculate("2", "Feature A", dec!(5), dec!(5), dec!(5), dec!(2), None).unwrap(),      // Score 7.5, Size 2
        calculator.calculate("3", "Feature B", dec!(8), dec!(8), dec!(8), dec!(2), None).unwrap(),      // Score 12.0, Size 2
        calculator.calculate("4", "Research", dec!(2), dec!(2), dec!(2), dec!(5), None).unwrap(),       // Score 1.2, Size 5
    ];

    // Capacity: Now=2 points, Next=3 points
    // Expected:
    // 1. Critical Fix (Score 30, Size 1) -> Now (Used 1/2)
    // 2. Feature B (Score 12, Size 2) -> Next (Now full: 1+2 > 2. So goes to Next? Used 2/3)
    //    Wait, logic: if fits in Now, put in Now. else check Next.
    //    Item 1: Size 1. Fits in Now (0+1 <= 2). Now=1.
    //    Item 3: Size 2. Fits in Now? (1+2 = 3 > 2). No. Check Next. Fits in Next (0+2 <= 3). Next=2.
    //    Item 2: Size 2. Fits in Now? (1+2 > 2). No. Check Next. Fits in Next? (2+2 = 4 > 3). No. Later.
    //    Item 4: Size 5. Later.

    BudgetGuardrail::allocate_horizons(&mut items, dec!(2), dec!(3));

    // Sort is inplace by score descending, so order is: 1, 3, 2, 4

    let i1 = items.iter().find(|i| i.id == "1").unwrap();
    assert_eq!(i1.horizon, Some(Horizon::Now));

    let i3 = items.iter().find(|i| i.id == "3").unwrap();
    assert_eq!(i3.horizon, Some(Horizon::Next));

    let i2 = items.iter().find(|i| i.id == "2").unwrap();
    assert_eq!(i2.horizon, Some(Horizon::Later));

    let i4 = items.iter().find(|i| i.id == "4").unwrap();
    assert_eq!(i4.horizon, Some(Horizon::Later));
}
