module loyaltyprogram_addr::LoyaltyProgram {
    
    use aptos_framework::signer;
    use aptos_framework::randomness;
    use aptos_std::table::{Self, Table}; 
    use std::vector;

    struct Merchant has store {
        balance: u64,
        spin_probabilities: vector<u64>,
        spin_amounts: vector<u64>,
        coupons: vector<Coupon>,
        customer_stamps: Table<address, u64>,
        customer_lifetime_stamps: Table<address, u64>,
        tier_thresholds: vector<u64>,
    }

    struct Coupon has store {
        id: u64,
        stamps_required: u64,
        description: vector<u8>,
        is_monetary: bool,
        value: u64,
    }

    struct LoyaltyProgram has key {
        merchants: vector<Merchant>,
        lucky_spin_enabled: bool,
    }

    public fun initialize(account: &signer, lucky_spin_enabled: bool) {
        let program = LoyaltyProgram {
            merchants: vector::empty<Merchant>(),
            lucky_spin_enabled,
        };
        move_to(account, program);
    }

    public fun set_spin_probabilities(account: &signer, probabilities: vector<u64>, amounts: vector<u64>) acquires LoyaltyProgram {
        let program = borrow_global_mut<LoyaltyProgram>(signer::address_of(account));
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        merchant.spin_probabilities = probabilities;
        merchant.spin_amounts = amounts;
    }

    public fun create_coupon(account: &signer, id: u64, stamps_required: u64, description: vector<u8>, is_monetary: bool, value: u64) acquires LoyaltyProgram {
        let program = borrow_global_mut<LoyaltyProgram>(signer::address_of(account));
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        let coupon = Coupon {
            id,
            stamps_required,
            description,
            is_monetary,
            value,
        };
        vector::push_back(&mut merchant.coupons, coupon);
    }

    public fun set_tier_thresholds(account: &signer, thresholds: vector<u64>) acquires LoyaltyProgram {
        let program = borrow_global_mut<LoyaltyProgram>(signer::address_of(account));
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        merchant.tier_thresholds = thresholds;
    }

    public fun earn_stamps(account: &signer, customer: address, amount: u64) acquires LoyaltyProgram {
        let program = borrow_global_mut<LoyaltyProgram>(signer::address_of(account));
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        let stamps = amount / 10; // Assuming 1 stamp per $10 spent
        table::add(&mut merchant.customer_stamps, customer, stamps);
        table::add(&mut merchant.customer_lifetime_stamps, customer, stamps);
    }

    public fun redeem_coupon(account: &signer, customer: address, coupon_id: u64) acquires LoyaltyProgram {
        let program = borrow_global_mut<LoyaltyProgram>(signer::address_of(account));
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        let coupon = vector::borrow(&merchant.coupons, coupon_id);
        let customer_stamps = table::borrow_mut_with_default(&mut merchant.customer_stamps, customer, 0);
        assert!(*customer_stamps >= coupon.stamps_required, 1); // Dereference customer_stamps
        *customer_stamps = *customer_stamps - coupon.stamps_required; // Correct the operation to subtract stamps
    }

    #[lint::allow_unsafe_randomness]
    public fun lucky_spin(account: &signer, customer: address) acquires LoyaltyProgram {
        let program = borrow_global_mut<LoyaltyProgram>(signer::address_of(account));
        assert!(program.lucky_spin_enabled, 3);
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        
        // Generate a random u64 number
        let random_u64 = randomness::u64_range(0, 100);
        
        let cumulative_probability: u64 = 0;
        let winning_amount: u64 = 0;

        let i = 0;
        let len = vector::length(&merchant.spin_probabilities);
        while (i < len) {
            cumulative_probability = cumulative_probability + *vector::borrow(&merchant.spin_probabilities, i);
            if (random_u64 < cumulative_probability) {
                winning_amount = *vector::borrow(&merchant.spin_amounts, i);
                break
            };
            i = i + 1;
        };

        if (winning_amount > 0) {
            let coupon_id: u64 = vector::length(&merchant.coupons);
            let coupon = Coupon {
                id: coupon_id,
                stamps_required: 0,
                description: b"Spin Win",
                is_monetary: true,
                value: winning_amount,
            };
            vector::push_back(&mut merchant.coupons, coupon);
            // Add the coupon to the customer's stamps
            let current_stamps = table::borrow_mut_with_default(&mut merchant.customer_stamps, customer, 0);
            *current_stamps = *current_stamps + 1;
        }
    }

    public fun get_customer_tier(account: &signer, customer: address): u64 acquires LoyaltyProgram {
        let program = borrow_global<LoyaltyProgram>(signer::address_of(account));
        let merchant = vector::borrow(&program.merchants, 0);
        let lifetime_stamps = *table::borrow_with_default(&merchant.customer_lifetime_stamps, customer, &0);
        let i = 0;
        let len = vector::length(&merchant.tier_thresholds);
        while (i < len) {
            if (lifetime_stamps >= *vector::borrow(&merchant.tier_thresholds, i)) {
                return i + 1
            };
            i = i + 1;
        };
        0
    }
}