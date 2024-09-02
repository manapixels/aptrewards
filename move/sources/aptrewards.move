module AptRewards::AptRewards {
    use aptos_framework::signer;
    use aptos_framework::randomness;
    use aptos_std::table::{Self, Table};
    use std::vector;
    use AptRewards::AptRewardsEvents;

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

    struct LoyaltyProgram has store {
        id: u64,
        name: vector<u8>,
        merchants: vector<Merchant>,
        lucky_spin_enabled: bool,
        owner: address,
    }

    struct LoyaltyProgramFactory has key {
        programs: Table<u64, LoyaltyProgram>,
        program_count: u64,
        user_programs: Table<address, vector<u64>>,
        event_handle: EventHandle<AptRewardsEvents::LoyaltyProgramCreated>,
        ownership_event_handle: EventHandle<AptRewardsEvents::OwnershipTransferred>,
        spin_probabilities_event_handle: EventHandle<AptRewardsEvents::SpinProbabilitiesSet>,
        coupon_created_event_handle: EventHandle<AptRewardsEvents::CouponCreated>,
        tier_thresholds_event_handle: EventHandle<AptRewardsEvents::TierThresholdsSet>,
        stamps_earned_event_handle: EventHandle<AptRewardsEvents::StampsEarned>,
        coupon_redeemed_event_handle: EventHandle<AptRewardsEvents::CouponRedeemed>,
        lucky_spin_event_handle: EventHandle<AptRewardsEvents::LuckySpinResult>,
    }

    const E_NOT_OWNER: u64 = 1;
    const E_PROGRAM_NOT_FOUND: u64 = 2;

    public fun initialize_factory(account: &signer) {
        let factory = LoyaltyProgramFactory {
            programs: table::new(),
            program_count: 0,
            user_programs: table::new(),
            event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::LoyaltyProgramCreated>(account),
            ownership_event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::OwnershipTransferred>(account),
            spin_probabilities_event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::SpinProbabilitiesSet>(account),
            coupon_created_event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::CouponCreated>(account),
            tier_thresholds_event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::TierThresholdsSet>(account),
            stamps_earned_event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::StampsEarned>(account),
            coupon_redeemed_event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::CouponRedeemed>(account),
            lucky_spin_event_handle: aptos_framework::event::new_event_handle<AptRewardsEvents::LuckySpinResult>(account),
        };
        move_to(account, factory);
    }

    public entry fun create_loyalty_program(account: &signer, name: vector<u8>, lucky_spin_enabled: bool) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program_id = factory.program_count + 1;
        let owner_address = signer::address_of(account);

        let program = LoyaltyProgram {
            id: program_id,
            name,
            merchants: vector::empty<Merchant>(),
            lucky_spin_enabled,
            owner: owner_address,
        };

        table::add(&mut factory.programs, program_id, program);
        factory.program_count = program_id;

        if (!table::contains(&factory.user_programs, owner_address)) {
            table::add(&mut factory.user_programs, owner_address, vector::empty<u64>());
        };
        let user_programs = table::borrow_mut(&mut factory.user_programs, owner_address);
        vector::push_back(user_programs, program_id);

        AptRewardsEvents::emit_loyalty_program_created(&factory.event_handle, program_id, owner_address);
    }

    public entry fun transfer_ownership(account: &signer, program_id: u64, new_owner: address) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        let old_owner = program.owner;
        assert!(old_owner == signer::address_of(account), E_NOT_OWNER);

        // Remove program from current owner's list
        let current_owner_programs = table::borrow_mut(&mut factory.user_programs, old_owner);
        let (_, index) = vector::index_of(current_owner_programs, &program_id);
        vector::remove(current_owner_programs, index);

        // Add program to new owner's list
        if (!table::contains(&factory.user_programs, new_owner)) {
            table::add(&mut factory.user_programs, new_owner, vector::empty<u64>());
        };
        let new_owner_programs = table::borrow_mut(&mut factory.user_programs, new_owner);
        vector::push_back(new_owner_programs, program_id);

        // Update program owner
        program.owner = new_owner;

        AptRewardsEvents::emit_ownership_transferred(&factory.ownership_event_handle, program_id, old_owner, new_owner);
    }

    public entry fun set_spin_probabilities(account: &signer, program_id: u64, probabilities: vector<u64>, amounts: vector<u64>) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == signer::address_of(account), E_NOT_OWNER);
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        merchant.spin_probabilities = probabilities;
        merchant.spin_amounts = amounts;

        AptRewardsEvents::emit_spin_probabilities_set(&factory.spin_probabilities_event_handle, program_id);
    }

    public entry fun create_coupon(account: &signer, program_id: u64, id: u64, stamps_required: u64, description: vector<u8>, is_monetary: bool, value: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == signer::address_of(account), E_NOT_OWNER);
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        let coupon = Coupon {
            id,
            stamps_required,
            description,
            is_monetary,
            value,
        };
        vector::push_back(&mut merchant.coupons, coupon);

        AptRewardsEvents::emit_coupon_created(&factory.coupon_created_event_handle, program_id, id);
    }

    public entry fun set_tier_thresholds(account: &signer, program_id: u64, thresholds: vector<u64>) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == signer::address_of(account), E_NOT_OWNER);
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        merchant.tier_thresholds = thresholds;

        AptRewardsEvents::emit_tier_thresholds_set(&factory.tier_thresholds_event_handle, program_id);
    }

    public entry fun earn_stamps(account: &signer, program_id: u64, customer: address, amount: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        let stamps = amount / 10; // Assuming 1 stamp per $10 spent
        table::add(&mut merchant.customer_stamps, customer, stamps);
        table::add(&mut merchant.customer_lifetime_stamps, customer, stamps);

        AptRewardsEvents::emit_stamps_earned(&factory.stamps_earned_event_handle, program_id, customer, stamps);
    }

    public entry fun redeem_coupon(account: &signer, program_id: u64, customer: address, coupon_id: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        let merchant = vector::borrow_mut(&mut program.merchants, 0);
        let coupon = vector::borrow(&merchant.coupons, coupon_id);
        let customer_stamps = table::borrow_mut_with_default(&mut merchant.customer_stamps, customer, 0);
        assert!(*customer_stamps >= coupon.stamps_required, 1); // Dereference customer_stamps
        *customer_stamps = *customer_stamps - coupon.stamps_required; // Correct the operation to subtract stamps

        AptRewardsEvents::emit_coupon_redeemed(&factory.coupon_redeemed_event_handle, program_id, customer, coupon_id);
    }

    #[lint::allow_unsafe_randomness]
    public entry fun lucky_spin(account: &signer, program_id: u64, customer: address) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(signer::address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
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

        AptRewardsEvents::emit_lucky_spin_result(&factory.lucky_spin_event_handle, program_id, customer, winning_amount);
    }
}