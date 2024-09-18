module aptrewards_addr::AptRewardsMain {
    use std::vector;
    use aptrewards_addr::AptRewardsEvents::{Self, emit_create_loyalty_program};
    use std::signer::{address_of};
    use std::string::{String};
    use std::timepoint;
    use std::option::{Self, Option};
    use std::simple_map::{SimpleMap,Self};

    struct Voucher has store, drop, copy {
        id: u64,
        points_required: u64,
        description: String,
        expiration_date: u64,
        max_redemptions: u64,
        redeemed_by: vector<address>,
        is_used: bool,
    }

    struct Tier has store, drop, copy {
        id: u64,
        name: String,
        points_required: u64,
        benefits: vector<String>,
    }

    struct LoyaltyProgram has key, store {
        id: u64,
        name: String,
        owner: address,
        vouchers: vector<Voucher>,
        voucher_count: u64,
        customer_points: SimpleMap<address, u64>,
        customer_lifetime_points: SimpleMap<address, u64>,
        customer_last_point_date: SimpleMap<address, u64>,
        point_validity_days: u64,
        tiers: vector<Tier>,
    }

    struct LoyaltyProgramFactory has key {
        programs: SimpleMap<u64, LoyaltyProgram>,
        program_count: u64,
        user_programs: SimpleMap<address, vector<u64>>,
    }

    const E_NOT_OWNER: u64 = 1;
    const E_PROGRAM_NOT_FOUND: u64 = 2;
    const E_COUPON_NOT_FOUND: u64 = 3;
    const E_CUSTOMER_NOT_FOUND: u64 = 4;
    const E_INSUFFICIENT_STAMPS: u64 = 5;
    const E_NOT_AUTHORIZED: u64 = 6;
    const E_COUPON_LIMIT_REACHED: u64 = 7;
    const E_COUPON_EXPIRED: u64 = 8;
    const E_TIER_NOT_FOUND: u64 = 11;
    const E_INVALID_SPIN_CONFIG: u64 = 12;
    const E_COUPON_ALREADY_REDEEMED: u64 = 13;

    fun init_module(aptrewards_addr: &signer) {
        let factory = LoyaltyProgramFactory {
            programs: simple_map::create<u64, LoyaltyProgram>(),
            program_count: 0,
            user_programs: simple_map::create<address, vector<u64>>(),
        };
        move_to(aptrewards_addr, factory);
    }

    public entry fun create_loyalty_program(sender: &signer, name: String, point_validity_days: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program_id = factory.program_count + 1;
        let owner_address = address_of(sender);

        let program = LoyaltyProgram {
            id: program_id,
            name,
            owner: owner_address,
            vouchers: vector::empty(),
            voucher_count: 0,
            customer_points: simple_map::create<address, u64>(),
            customer_lifetime_points: simple_map::create<address, u64>(),
            customer_last_point_date: simple_map::create<address, u64>(),
            point_validity_days,
            tiers: vector::empty(),
        };

        simple_map::add(&mut factory.programs, program_id, program);
        factory.program_count = program_id;

        if (!simple_map::contains_key(&factory.user_programs, &owner_address)) {
            simple_map::add(&mut factory.user_programs, owner_address, vector::empty<u64>());
        };
        let user_programs = simple_map::borrow_mut(&mut factory.user_programs, &owner_address);
        vector::push_back(user_programs, program_id);

        emit_create_loyalty_program(program_id, owner_address, point_validity_days);
    }

    public entry fun edit_loyalty_program(
        sender: &signer,
        program_id: u64,
        new_name: Option<String>,
        new_point_validity_days: Option<u64>
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(simple_map::contains_key(&factory.programs, &program_id), E_PROGRAM_NOT_FOUND);
        
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);

        if (option::is_some(&new_name)) {
            program.name = option::extract(&mut new_name);
        };

        if (option::is_some(&new_point_validity_days)) {
            program.point_validity_days = option::extract(&mut new_point_validity_days);
        };

        AptRewardsEvents::emit_edit_loyalty_program(
            program_id,
            program.name,
            program.point_validity_days
        );
    }

    public entry fun transfer_ownership(sender: &signer, program_id: u64, new_owner: address) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        let old_owner = program.owner;
        assert!(old_owner == address_of(sender), E_NOT_OWNER);

        // Remove program from current owner's list
        let current_owner_programs = simple_map::borrow_mut(&mut factory.user_programs, &old_owner);
        let (_, index) = vector::index_of(current_owner_programs, &program_id);
        vector::remove(current_owner_programs, index);

        // Add program to new owner's list
        if (!simple_map::contains_key(&factory.user_programs, &new_owner)) {
            simple_map::add(&mut factory.user_programs, new_owner, vector::empty<u64>());
        };
        let new_owner_programs = simple_map::borrow_mut(&mut factory.user_programs, &new_owner);
        vector::push_back(new_owner_programs, program_id);

        // Update program owner
        program.owner = new_owner;

        AptRewardsEvents::emit_transfer_ownership(program_id, old_owner, new_owner);
    }

    public entry fun create_voucher(
        account: &signer,
        program_id: u64,
        description: String,
        points_required: u64,
        expiration_date: u64,
        max_redemptions: u64
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(simple_map::contains_key(&factory.programs, &program_id), E_PROGRAM_NOT_FOUND);
        
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        assert!(program.owner == address_of(account), E_NOT_OWNER);

        let voucher = Voucher {
            id: program.voucher_count,
            description,
            points_required,
            expiration_date,
            max_redemptions,
            redeemed_by: vector::empty<address>(),
            is_used: false,
        };

        vector::push_back(&mut program.vouchers, voucher);
        program.voucher_count = program.voucher_count + 1;

        AptRewardsEvents::emit_create_voucher(program_id, voucher.id, points_required, description, expiration_date, max_redemptions);
    }

    public entry fun add_tier(
        sender: &signer,
        program_id: u64,
        name: String,
        points_required: u64,
        benefits: vector<String>
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        
        let tier_id = vector::length(&program.tiers);
        let new_tier = Tier {
            id: tier_id,
            name,
            points_required,
            benefits,
        };
        vector::push_back(&mut program.tiers, new_tier);

        AptRewardsEvents::emit_add_tier(program_id, tier_id, name, benefits, points_required);
    }

    public entry fun remove_tier(
        sender: &signer,
        program_id: u64,
        tier_id: u64
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        assert!(tier_id < vector::length(&program.tiers), E_TIER_NOT_FOUND);

        let removed_tier = vector::remove(&mut program.tiers, tier_id);
        AptRewardsEvents::emit_remove_tier(program_id, tier_id, removed_tier.name);
    }

    public entry fun edit_tier(
        sender: &signer,
        program_id: u64,
        tier_id: u64,
        new_name: String,
        new_points_required: u64,
        new_benefits: vector<String>
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        assert!(tier_id < vector::length(&program.tiers), E_TIER_NOT_FOUND);

        let tier = vector::borrow_mut(&mut program.tiers, tier_id);
        tier.name = new_name;
        tier.points_required = new_points_required;
        tier.benefits = new_benefits;

        AptRewardsEvents::emit_edit_tier(program_id, tier_id, new_name, new_benefits, new_points_required);
    }

    public entry fun earn_points(admin: &signer, program_id: u64, customer: address, amount: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        
        assert!(program.owner == address_of(admin), E_NOT_OWNER);

        // Check for expired points and reset if necessary
        if (simple_map::contains_key(&program.customer_points, &customer)) {
            let customer_points = simple_map::borrow_mut(&mut program.customer_points, &customer);
            let last_point_date = simple_map::borrow_mut(&mut program.customer_last_point_date, &customer);
            if (timepoint::now_seconds() > *last_point_date + (program.point_validity_days * 24 * 60 * 60)) {
                *customer_points = 0;
            }
        };

        // Update customer_points
        if (!simple_map::contains_key(&program.customer_points, &customer)) {
            simple_map::add(&mut program.customer_points, customer, amount);
            simple_map::add(&mut program.customer_last_point_date, customer, timepoint::now_seconds());
        } else {
            let customer_points = simple_map::borrow_mut(&mut program.customer_points, &customer);
            *customer_points = *customer_points + amount;
            let last_point_date = simple_map::borrow_mut(&mut program.customer_last_point_date, &customer);
            *last_point_date = timepoint::now_seconds();
        };

        // Update customer_lifetime_points
        if (!simple_map::contains_key(&program.customer_lifetime_points, &customer)) {
            simple_map::add(&mut program.customer_lifetime_points, customer, amount);
        } else {
            let customer_lifetime_points = simple_map::borrow_mut(&mut program.customer_lifetime_points, &customer);
            *customer_lifetime_points = *customer_lifetime_points + amount;
        };

        AptRewardsEvents::emit_earn_points(program_id, customer, amount);
    }

    public entry fun redeem_voucher(sender: &signer, program_id: u64, customer: address, voucher_id: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(simple_map::contains_key(&factory.programs, &program_id), E_PROGRAM_NOT_FOUND);
        
        let program = simple_map::borrow_mut(&mut factory.programs, &program_id);
        assert!(vector::length(&program.vouchers) > voucher_id, E_COUPON_NOT_FOUND);
        
        let sender_address = address_of(sender);
        assert!(sender_address == program.owner || sender_address == customer, E_NOT_AUTHORIZED);
        
        assert!(simple_map::contains_key(&program.customer_points, &customer), E_CUSTOMER_NOT_FOUND);
        
        let voucher = vector::borrow_mut(&mut program.vouchers, voucher_id);
        assert!(vector::length(&voucher.redeemed_by) < voucher.max_redemptions, E_COUPON_LIMIT_REACHED);
        assert!(timepoint::now_seconds() <= voucher.expiration_date, E_COUPON_EXPIRED);
        assert!(!vector::contains(&voucher.redeemed_by, &customer), E_COUPON_ALREADY_REDEEMED);
        
        // Check for expired points before redemption
        let customer_points = simple_map::borrow_mut(&mut program.customer_points, &customer);
        let last_point_date = simple_map::borrow(&program.customer_last_point_date, &customer);
        if (timepoint::now_seconds() > *last_point_date + (program.point_validity_days * 24 * 60 * 60)) {
            *customer_points = 0;
        };
        
        assert!(*customer_points >= voucher.points_required, E_INSUFFICIENT_STAMPS);
        
        *customer_points = *customer_points - voucher.points_required;
        vector::push_back(&mut voucher.redeemed_by, customer);
        
        AptRewardsEvents::emit_redeem_voucher(program_id, customer, voucher_id, vector::length(&voucher.redeemed_by), voucher.description);
    }

    struct TierWithCustomerCount has drop, store {
        id: u64,
        name: String,
        points_required: u64,
        benefits: vector<String>,
        customer_count: u64,
    }

    struct CustomerWithPoints has drop, store {
        customer: address,
        points: u64,
    }

    #[view]
    public fun get_loyalty_program_details(program_id: u64): (
        u64, // id
        String, // name
        address, // owner
        u64, // point_validity_days
        vector<Voucher>,
        vector<TierWithCustomerCount>,
        u64, // total_points_issued
        vector<CustomerWithPoints> // customers_with_points
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(simple_map::contains_key(&factory.programs, &program_id), E_PROGRAM_NOT_FOUND);
        
        let program = simple_map::borrow(&factory.programs, &program_id);
        let total_points_issued = calculate_total_points(program);
        let customers_with_points = get_customers_with_points(program);

        let tiers_with_customer_count = vector::empty<TierWithCustomerCount>();
        let i = 0;
        let len = vector::length(&program.tiers);
        while (i < len) {
            let tier = vector::borrow(&program.tiers, i);
            let customer_count = count_customers_in_tier(program, tier.points_required);
            let tier_with_customer_count = TierWithCustomerCount {
                id: tier.id,
                name: tier.name,
                points_required: tier.points_required,
                benefits: tier.benefits,
                customer_count,
            };
            vector::push_back(&mut tiers_with_customer_count, tier_with_customer_count);
            i = i + 1;
        };

        (
            program.id,
            program.name,
            program.owner,
            program.point_validity_days,
            *&program.vouchers,
            tiers_with_customer_count,
            total_points_issued,
            customers_with_points
        )
    }

    // Helper function to count customers in a specific tier
    fun count_customers_in_tier(program: &LoyaltyProgram, tier_points: u64): u64 {
        let count = 0;
        let keys = simple_map::keys(&program.customer_points);
        let len = vector::length(&keys);
        let i = 0;
        let next_tier_points = option::none();

        // Find the next tier's point requirement
        let j = 0;
        while (j < vector::length(&program.tiers)) {
            let tier = vector::borrow(&program.tiers, j);
            if (tier.points_required > tier_points) {
                next_tier_points = option::some(tier.points_required);
                break
            };
            j = j + 1;
        };

        while (i < len) {
            let customer = vector::borrow(&keys, i);
            let points = *simple_map::borrow(&program.customer_points, customer);
            if (points >= tier_points && (option::is_none(&next_tier_points) || points < *option::borrow(&next_tier_points))) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }

    // Helper function to calculate total points issued
    fun calculate_total_points(program: &LoyaltyProgram): u64 {
        let total_points = 0u64;
        let keys = simple_map::keys(&program.customer_points);
        let len = vector::length(&keys);
        let i = 0;
        while (i < len) {
            let customer = vector::borrow(&keys, i);
            total_points = total_points + *simple_map::borrow(&program.customer_points, customer);
            i = i + 1;
        };
        total_points
    }

    // Helper function to get customers with their point counts
    fun get_customers_with_points(program: &LoyaltyProgram): vector<CustomerWithPoints> {
        let customers_with_points = vector::empty<CustomerWithPoints>();
        let keys = simple_map::keys(&program.customer_points);
        let values = simple_map::values(&program.customer_points);
        let i = 0;
        let len = vector::length(&keys);
        while (i < len) {
            let customer = *vector::borrow(&keys, i);
            let point_count = *vector::borrow(&values, i);
            vector::push_back(&mut customers_with_points, CustomerWithPoints { customer, points: point_count });
            i = i + 1;
        };
        customers_with_points
    }

    struct LoyaltyProgramSummary has drop, store {
        id: u64,
        name: String,
        owner: address,
        customer_count: u64,
    }

    #[view]
    public fun get_owned_loyalty_programs(owner: address): vector<LoyaltyProgramSummary> acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let programs = vector::empty<LoyaltyProgramSummary>();

        if (simple_map::contains_key(&factory.user_programs, &owner)) {
            let program_ids = *simple_map::borrow(&factory.user_programs, &owner);
            let len = vector::length(&program_ids);
            let i = 0;
            while (i < len) {
                let program_id = *vector::borrow(&program_ids, i);
                let program = simple_map::borrow(&factory.programs, &program_id);
                let num_customers = simple_map::length(&program.customer_points);

                let summary = LoyaltyProgramSummary {
                    id: program.id,
                    name: program.name,
                    owner: program.owner,
                    customer_count: num_customers,
                };
                vector::push_back(&mut programs, summary);
                i = i + 1;
            }
        };
        programs
    }

    #[view]
    public fun get_user_program_details(program_id: u64, user_address: address): (String, u64, u64, vector<Voucher>, vector<Voucher>, vector<Tier>) acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(simple_map::contains_key(&factory.programs, &program_id), E_PROGRAM_NOT_FOUND);
        
        let program = simple_map::borrow(&factory.programs, &program_id);
        let user_points = if (simple_map::contains_key(&program.customer_points, &user_address)) {
            *simple_map::borrow(&program.customer_points, &user_address)
        } else {
            0
        };

        let owned_vouchers = get_user_owned_vouchers(program, user_address);

        (
            program.name,
            user_points,
            program.point_validity_days,
            owned_vouchers,
            program.vouchers,
            program.tiers
        )
    }

    fun get_user_owned_vouchers(program: &LoyaltyProgram, user_address: address): vector<Voucher> {
        let owned_vouchers = vector::empty<Voucher>();
        let i = 0;
        let len = vector::length(&program.vouchers);
        
        while (i < len) {
            let voucher = vector::borrow(&program.vouchers, i);
            if (vector::contains(&voucher.redeemed_by, &user_address)) {
                vector::push_back(&mut owned_vouchers, *voucher);
            };
            i = i + 1;
        };
        
        owned_vouchers
    }

    struct UserProgramDetails has drop, store {
        program_id: u64,
        program_name: String,
        points: u64,
        lifetime_points: u64,
        owned_vouchers: vector<Voucher>,
        current_tier: Option<Tier>,
        next_tier: Option<Tier>,
        points_to_next_tier: u64,
    }

    #[view]
    public fun get_user_details(user_address: address): vector<UserProgramDetails> acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let user_details = vector::empty<UserProgramDetails>();

        let program_ids = simple_map::keys(&factory.programs);
        let i = 0;
        let len = vector::length(&program_ids);

        while (i < len) {
            let program_id = *vector::borrow(&program_ids, i);
            let program = simple_map::borrow(&factory.programs, &program_id);

            if (simple_map::contains_key(&program.customer_points, &user_address)) {
                let points = *simple_map::borrow(&program.customer_points, &user_address);
                let lifetime_points = *simple_map::borrow(&program.customer_lifetime_points, &user_address);
                let owned_vouchers = get_user_owned_vouchers(program, user_address);
                let (current_tier, next_tier, points_to_next_tier) = get_user_tier_info(program, points);

                let program_details = UserProgramDetails {
                    program_id: *&program_id,
                    program_name: program.name,
                    points,
                    lifetime_points,
                    owned_vouchers,
                    current_tier,
                    next_tier,
                    points_to_next_tier,
                };

                vector::push_back(&mut user_details, program_details);
            };

            i = i + 1;
        };

        user_details
    }

    fun get_user_tier_info(program: &LoyaltyProgram, user_points: u64): (Option<Tier>, Option<Tier>, u64) {
        let current_tier = option::none<Tier>();
        let next_tier = option::none<Tier>();
        let points_to_next_tier = 0u64;

        let i = 0;
        let len = vector::length(&program.tiers);

        while (i < len) {
            let tier = vector::borrow(&program.tiers, i);
            if (user_points >= tier.points_required) {
                current_tier = option::some(*tier);
            } else {
                next_tier = option::some(*tier);
                points_to_next_tier = tier.points_required - user_points;
                break
            };
            i = i + 1;
        };

        (current_tier, next_tier, points_to_next_tier)
    }

    /////////////////////////// Tests //////////////////////////////////
    #[test_only]
    use aptos_framework::account;
    #[test_only]
    use aptos_framework::randomness;
    #[test_only]
    use std::string::{utf8};
    #[test_only]
    use aptos_std::crypto_algebra::enable_cryptography_algebra_natives;

    #[test_only]
    fun setup_test(
        fx: &signer,
        owner: &signer,
    ) {
        enable_cryptography_algebra_natives(fx);
        randomness::initialize_for_testing(fx);
        randomness::set_seed(x"0000000000000000000000000000000000000000000000000000000000000000");

        // Create a fake account for the owner (only for testing purposes)
        account::create_account_for_test(address_of(owner));

        // Create a fake account for the aptrewards_addr (only for testing purposes)
        account::create_account_for_test(@aptrewards_addr);

        // Initialize timepoint for testing
        timepoint::set_time_has_started_for_testing(fx);

        // Call init_module with the correct signer
        let aptrewards_signer = account::create_signer_for_test(@aptrewards_addr);
        init_module(&aptrewards_signer);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_create_loyalty_program(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        // Checks if the program count in the factory is equal to 1, indicating a single program was created successfully.
        assert!(factory.program_count == 1, 0);

        // Checks if the program with ID 1 exists in the factory's programs table, indicating it was successfully created and stored.
        assert!(simple_map::contains_key(&factory.programs, &1), 1);
    }

    #[test(fx = @aptos_framework, owner = @0x123, new_owner = @0x456)]
    public fun test_transfer_ownership(fx: &signer, owner: &signer, new_owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        account::create_account_for_test(address_of(new_owner));
        transfer_ownership(owner, 1, address_of(new_owner));
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        // Checks if the program owner has been successfully transferred to the new owner
        assert!(program.owner == address_of(new_owner), 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_create_voucher(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        create_voucher(owner, 1, utf8(b"Test Voucher"), 10, timepoint::now_seconds() + 60 * 60 * 24 * 7, 1);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        // Checks if the length of the merchant's vouchers vector is equal to 1, indicating a single voucher was created successfully.
        assert!(vector::length(&program.vouchers) == 1, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_add_tier(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let benefits = vector::empty<String>();
        vector::push_back(&mut benefits, utf8(b"Benefit 1"));
        vector::push_back(&mut benefits, utf8(b"Benefit 2"));
        add_tier(owner, 1, utf8(b"Bronze"), 100, benefits);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        assert!(vector::length(&program.tiers) == 1, 0);
        let tier = vector::borrow(&program.tiers, 0);
        assert!(tier.name == utf8(b"Bronze"), 1);
        assert!(tier.points_required == 100, 2);
        assert!(vector::length(&tier.benefits) == 2, 3);
        assert!(*vector::borrow(&tier.benefits, 0) == utf8(b"Benefit 1"), 4);
        assert!(*vector::borrow(&tier.benefits, 1) == utf8(b"Benefit 2"), 5);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_remove_tier(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let benefits = vector::empty<String>();
        vector::push_back(&mut benefits, utf8(b"Benefit 1"));
        vector::push_back(&mut benefits, utf8(b"Benefit 2"));
        add_tier(owner, 1, utf8(b"Bronze"), 100, benefits);
        add_tier(owner, 1, utf8(b"Silver"), 200, benefits);
        
        remove_tier(owner, 1, 0);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        assert!(vector::length(&program.tiers) == 1, 0);
        let tier = vector::borrow(&program.tiers, 0);
        assert!(tier.name == utf8(b"Silver"), 1);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_edit_tier(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let benefits = vector::empty<String>();
        vector::push_back(&mut benefits, utf8(b"Benefit 1"));
        vector::push_back(&mut benefits, utf8(b"Benefit 2"));
        add_tier(owner, 1, utf8(b"Bronze"), 100, benefits);
        
        let new_benefits = vector::empty<String>();
        vector::push_back(&mut new_benefits, utf8(b"New Benefit 1"));
        vector::push_back(&mut new_benefits, utf8(b"New Benefit 2"));
        edit_tier(owner, 1, 0, utf8(b"New Bronze"), 150, new_benefits);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        let tier = vector::borrow(&program.tiers, 0);
        assert!(tier.name == utf8(b"New Bronze"), 0);
        assert!(tier.points_required == 150, 1);
        assert!(vector::length(&tier.benefits) == 2, 2);
        assert!(*vector::borrow(&tier.benefits, 0) == utf8(b"New Benefit 1"), 3);
        assert!(*vector::borrow(&tier.benefits, 1) == utf8(b"New Benefit 2"), 4);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_earn_points(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        account::create_account_for_test(address_of(customer));
        earn_points(owner, 1, address_of(customer), 10); // 10 points earned
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        
        // Checks if the customer's point count is 10 after earning 10 points
        assert!(*simple_map::borrow(&program.customer_points, &address_of(customer)) == 10, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_redeem_voucher(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        create_voucher(owner, 1, utf8(b"Test Voucher"), 10, timepoint::now_seconds() + 60 * 60 * 24 * 7, 1);
        
        account::create_account_for_test(address_of(customer));
        earn_points(owner, 1, address_of(customer), 10);
        
        redeem_voucher(owner, 1, address_of(customer), 0);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        // Checks if the customer's point count is 0 after redeeming a voucher
        assert!(*simple_map::borrow(&program.customer_points, &address_of(customer)) == 0, 0);
    }

    // This should fail due to voucher expiration
    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    #[expected_failure(abort_code = E_COUPON_EXPIRED)]
    public fun test_voucher_expiration(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let current_time = timepoint::now_seconds();
        create_voucher(owner, 1, utf8(b"Expired Voucher"), 10, current_time + 10, 1);
        
        account::create_account_for_test(address_of(customer));
        earn_points(owner, 1, address_of(customer), 10);        
        // Advance time by 11 seconds to make the voucher expire
        timepoint::fast_forward_seconds(11);
        
        // This should fail due to voucher expiration
        redeem_voucher(owner, 1, address_of(customer), 0);
    }

    // First redemption should succeed
    // Second redemption should fail due to reaching the redemption limit
    #[test(fx = @aptos_framework, owner = @0x123, customer1 = @0x456, customer2 = @0x789)]
    #[expected_failure(abort_code = E_COUPON_LIMIT_REACHED)]
    public fun test_voucher_redemption_limit(fx: &signer, owner: &signer, customer1: &signer, customer2: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let current_time = timepoint::now_seconds();
        create_voucher(owner, 1, utf8(b"Limited Voucher"), 10, current_time + 3600, 1);
        
        account::create_account_for_test(address_of(customer1));
        account::create_account_for_test(address_of(customer2));
        earn_points(owner, 1, address_of(customer1), 10);
        earn_points(owner, 1, address_of(customer2), 10);
        
        // First redemption
        redeem_voucher(owner, 1, address_of(customer1), 0);
        
        // Second redemption
        redeem_voucher(owner, 1, address_of(customer2), 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_edit_loyalty_program(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let new_name = option::some(utf8(b"Updated Program"));
        let new_point_validity_days = option::some(45);
        
        edit_loyalty_program(owner, 1, new_name, new_point_validity_days);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        
        // Check if the program details were updated correctly
        assert!(program.name == utf8(b"Updated Program"), 0);
        assert!(program.point_validity_days == 45, 1);
    }

    // Test editing only some fields
    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_edit_loyalty_program_partial(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let new_name = option::some(utf8(b"Updated Program"));
        let new_point_validity_days = option::none();
        
        edit_loyalty_program(owner, 1, new_name, new_point_validity_days);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = simple_map::borrow(&factory.programs, &1);
        
        // Check if only the name was updated
        assert!(program.name == utf8(b"Updated Program"), 0);
        assert!(program.point_validity_days == 30, 1); // Should remain unchanged
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_point_expiration(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30); // 30 days validity
        
        account::create_account_for_test(address_of(customer));
        earn_points(owner, 1, address_of(customer), 10); // Earn 10 points
        
        {
            let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
            let program = simple_map::borrow(&factory.programs, &1);
            assert!(*simple_map::borrow(&program.customer_points, &address_of(customer)) == 10, 0);
        }; // Release the borrow here
        
        // Fast forward time by 31 days (1 day more than validity period)
        timepoint::fast_forward_seconds(31 * 24 * 60 * 60);
        
        // Earn more points, which should trigger expiration check
        earn_points(owner, 1, address_of(customer), 5);
        
        {
            let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
            let program = simple_map::borrow(&factory.programs, &1);
            // Check if points were reset to 5 (new points) instead of 15 (10 + 5)
            assert!(*simple_map::borrow(&program.customer_points, &address_of(customer)) == 5, 1);
        };
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_point_validity(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30); // 30 days validity
        
        account::create_account_for_test(address_of(customer));
        earn_points(owner, 1, address_of(customer), 10); // Earn 10 points
        
        // Fast forward time by 29 days (1 day less than validity period)
        timepoint::fast_forward_seconds(29 * 24 * 60 * 60);
        
        // Earn more points
        earn_points(owner, 1, address_of(customer), 5);
        
        {
            let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
            let program = simple_map::borrow(&factory.programs, &1);
            // Check if points were added correctly (10 + 5)
            assert!(*simple_map::borrow(&program.customer_points, &address_of(customer)) == 15, 0);
            
            // Check if last_point_date was updated
            assert!(*simple_map::borrow(&program.customer_last_point_date, &address_of(customer)) == timepoint::now_seconds(), 1);
        };
    }
}