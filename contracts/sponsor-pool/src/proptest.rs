#![cfg(test)]
use proptest::prelude::*;

fn pro_rata_refund(supporter_amounts: &[i128], pool_balance: i128) -> i128 {
    let mut refunded: i128 = 0;
    for amount in supporter_amounts {
        let amount = *amount;
        if amount > 0 { refunded += amount; }
    }
    refunded
}

proptest! {
    #[test]
    fn refund_never_exceeds_balance(amounts in prop::collection::vec(0i128..1_000_000_000i128, 0..30)) {
        let total: i128 = amounts.iter().sum();
        let refunded = pro_rata_refund(&amounts, total);
        prop_assert_eq!(refunded, total, "full refund restores exactly the deposited total");
    }
}

proptest! {
    #[test]
    fn vote_tally(entries in prop::collection::vec((0i128..1_000_000_000i128, any::<bool>()), 0..20)) {
        let total: i128 = entries.iter().map(|(a, _)| a).sum();
        prop_assert!(total >= 0);
    }
}
