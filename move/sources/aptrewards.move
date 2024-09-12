module aptrewards_addr::AptRewardsMain {
    use aptos_std::table::{Self, Table};
    use std::vector;
    use aptrewards_addr::AptRewardsEvents::{Self, emit_create_loyalty_program};
    use std::signer::address_of;
    use std::string::{String};
    use std::timestamp;
    use std::option::{Self, Option};

    struct Coupon has store, drop, copy {
        id: u64,
        stamps_required: u64,
        description: String,
        is_monetary: bool,
        value: u64,
        expiration_date: u64,
        max_redemptions: u64,
        current_redemptions: u64,
    }

    struct Tier has store, drop, copy {
        id: u64,
        name: String,
        stamps_required: u64,
        benefits: vector<String>,
    }

    struct LoyaltyProgram has key, store {
        id: u64,
        name: String,
        owner: address,
        coupons: vector<Coupon>,
        coupon_count: u64,
        customer_stamps: Table<address, u64>,
        customer_lifetime_stamps: Table<address, u64>,
        customer_last_stamp_date: Table<address, u64>,
        stamp_validity_days: u64,
        tiers: vector<Tier>,
    }

    struct LoyaltyProgramFactory has key {
        programs: Table<u64, LoyaltyProgram>,
        program_count: u64,
        user_programs: Table<address, vector<u64>>,
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

    fun init_module(aptrewards_addr: &signer) {
        let factory = LoyaltyProgramFactory {
            programs: table::new(),
            program_count: 0,
            user_programs: table::new(),
        };
        move_to(aptrewards_addr, factory);
    }

    public entry fun create_loyalty_program(sender: &signer, name: String, stamp_validity_days: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program_id = factory.program_count + 1;
        let owner_address = address_of(sender);

        let program = LoyaltyProgram {
            id: program_id,
            name,
            owner: owner_address,
            coupons: vector::empty(),
            coupon_count: 0,
            customer_stamps: table::new(),
            customer_lifetime_stamps: table::new(),
            customer_last_stamp_date: table::new(),
            stamp_validity_days,
            tiers: vector::empty(),
        };

        table::add(&mut factory.programs, program_id, program);
        factory.program_count = program_id;

        if (!table::contains(&factory.user_programs, owner_address)) {
            table::add(&mut factory.user_programs, owner_address, vector::empty<u64>());
        };
        let user_programs = table::borrow_mut(&mut factory.user_programs, owner_address);
        vector::push_back(user_programs, program_id);

        emit_create_loyalty_program(program_id, owner_address, stamp_validity_days);
    }

    public entry fun transfer_ownership(sender: &signer, program_id: u64, new_owner: address) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        let old_owner = program.owner;
        assert!(old_owner == address_of(sender), E_NOT_OWNER);

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

        AptRewardsEvents::emit_transfer_ownership(program_id, old_owner, new_owner);
    }

    public entry fun create_coupon(
        sender: &signer,
        program_id: u64,
        stamps_required: u64,
        description: String,
        is_monetary: bool,
        value: u64,
        expiration_date: u64,
        max_redemptions: u64
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        
        // Generate a new coupon ID
        let coupon_id = program.coupon_count;
        program.coupon_count = program.coupon_count + 1;

        let coupon = Coupon {
            id: coupon_id,
            stamps_required,
            description,
            is_monetary,
            value,
            expiration_date,
            max_redemptions,
            current_redemptions: 0,
        };
        vector::push_back(&mut program.coupons, coupon);

        AptRewardsEvents::emit_create_coupon(program_id, coupon_id, stamps_required, description, is_monetary, value, expiration_date, max_redemptions);
    }

    public entry fun add_tier(
        sender: &signer,
        program_id: u64,
        name: String,
        stamps_required: u64,
        benefits: vector<String>
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        
        let tier_id = vector::length(&program.tiers);
        let new_tier = Tier {
            id: tier_id,
            name,
            stamps_required,
            benefits,
        };
        vector::push_back(&mut program.tiers, new_tier);

        AptRewardsEvents::emit_add_tier(program_id, tier_id, name, benefits, stamps_required);
    }

    public entry fun remove_tier(
        sender: &signer,
        program_id: u64,
        tier_id: u64
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
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
        new_stamps_required: u64,
        new_benefits: vector<String>
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        assert!(tier_id < vector::length(&program.tiers), E_TIER_NOT_FOUND);

        let tier = vector::borrow_mut(&mut program.tiers, tier_id);
        tier.name = new_name;
        tier.stamps_required = new_stamps_required;
        tier.benefits = new_benefits;

        AptRewardsEvents::emit_edit_tier(program_id, tier_id, new_name, new_benefits, new_stamps_required);
    }

    public entry fun earn_stamps(admin: &signer, program_id: u64, customer: address, amount: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        
        assert!(program.owner == address_of(admin), E_NOT_OWNER);

        // Check for expired stamps and reset if necessary
        if (table::contains(&program.customer_stamps, customer)) {
            let customer_stamps = table::borrow_mut(&mut program.customer_stamps, customer);
            let last_stamp_date = table::borrow_mut(&mut program.customer_last_stamp_date, customer);
            if (timestamp::now_seconds() > *last_stamp_date + (program.stamp_validity_days * 24 * 60 * 60)) {
                *customer_stamps = 0;
            }
        };

        // Update customer_stamps
        if (!table::contains(&program.customer_stamps, customer)) {
            table::add(&mut program.customer_stamps, customer, amount);
            table::add(&mut program.customer_last_stamp_date, customer, timestamp::now_seconds());
        } else {
            let customer_stamps = table::borrow_mut(&mut program.customer_stamps, customer);
            *customer_stamps = *customer_stamps + amount;
            let last_stamp_date = table::borrow_mut(&mut program.customer_last_stamp_date, customer);
            *last_stamp_date = timestamp::now_seconds();
        };

        // Update customer_lifetime_stamps
        if (!table::contains(&program.customer_lifetime_stamps, customer)) {
            table::add(&mut program.customer_lifetime_stamps, customer, amount);
        } else {
            let customer_lifetime_stamps = table::borrow_mut(&mut program.customer_lifetime_stamps, customer);
            *customer_lifetime_stamps = *customer_lifetime_stamps + amount;
        };

        AptRewardsEvents::emit_earn_stamps(program_id, customer, amount);
    }

    public entry fun redeem_coupon(sender: &signer, program_id: u64, customer: address, coupon_id: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(table::contains(&factory.programs, program_id), E_PROGRAM_NOT_FOUND);
        
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(vector::length(&program.coupons) > coupon_id, E_COUPON_NOT_FOUND);
        
        let sender_address = address_of(sender);
        assert!(sender_address == program.owner || sender_address == customer, E_NOT_AUTHORIZED);
        
        assert!(table::contains(&program.customer_stamps, customer), E_CUSTOMER_NOT_FOUND);
        
        let coupon = vector::borrow_mut(&mut program.coupons, coupon_id);
        assert!(coupon.current_redemptions < coupon.max_redemptions, E_COUPON_LIMIT_REACHED);
        assert!(timestamp::now_seconds() <= coupon.expiration_date, E_COUPON_EXPIRED);
        
        // Check for expired stamps before redemption
        let customer_stamps = table::borrow_mut(&mut program.customer_stamps, customer);
        let last_stamp_date = table::borrow(&program.customer_last_stamp_date, customer);
        if (timestamp::now_seconds() > *last_stamp_date + (program.stamp_validity_days * 24 * 60 * 60)) {
            *customer_stamps = 0;
        };
        
        assert!(*customer_stamps >= coupon.stamps_required, E_INSUFFICIENT_STAMPS);
        
        *customer_stamps = *customer_stamps - coupon.stamps_required;
        coupon.current_redemptions = coupon.current_redemptions + 1;
        
        AptRewardsEvents::emit_redeem_coupon(program_id, customer, coupon_id, coupon.current_redemptions, coupon.description, coupon.value);
    }

    #[view]
    public fun get_loyalty_program_details(program_id: u64): (u64, String, address, u64, u64, vector<Coupon>, vector<Tier>) acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(table::contains(&factory.programs, program_id), E_PROGRAM_NOT_FOUND);
        
        let program = table::borrow(&factory.programs, program_id);
        (
            program.id,
            program.name,
            program.owner,
            program.coupon_count,
            program.stamp_validity_days,
            *&program.coupons,  // Return a copy of the coupons vector
            *&program.tiers     // Return a copy of the tiers vector
        )
    }

    #[view]
    public fun get_owned_loyalty_programs(owner: address): vector<u64> acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        if (table::contains(&factory.user_programs, owner)) {
            *table::borrow(&factory.user_programs, owner)
        } else {
            vector::empty<u64>()
        }
    }

    public entry fun edit_loyalty_program(
        sender: &signer,
        program_id: u64,
        new_name: Option<String>,
        new_stamp_validity_days: Option<u64>
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(table::contains(&factory.programs, program_id), E_PROGRAM_NOT_FOUND);
        
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);

        if (option::is_some(&new_name)) {
            program.name = option::extract(&mut new_name);
        };

        if (option::is_some(&new_stamp_validity_days)) {
            program.stamp_validity_days = option::extract(&mut new_stamp_validity_days);
        };

        AptRewardsEvents::emit_edit_loyalty_program(
            program_id,
            program.name,
            program.stamp_validity_days
        );
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

        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(fx);

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
        assert!(table::contains(&factory.programs, 1), 1);
    }

    #[test(fx = @aptos_framework, owner = @0x123, new_owner = @0x456)]
    public fun test_transfer_ownership(fx: &signer, owner: &signer, new_owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        account::create_account_for_test(address_of(new_owner));
        transfer_ownership(owner, 1, address_of(new_owner));
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Checks if the program owner has been successfully transferred to the new owner
        assert!(program.owner == address_of(new_owner), 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_create_coupon(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        create_coupon(owner, 1, 10, utf8(b"Test Coupon"), true, 100, timestamp::now_seconds() + 60 * 60 * 24 * 7, 1);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Checks if the length of the merchant's coupons vector is equal to 1, indicating a single coupon was created successfully.
        assert!(vector::length(&program.coupons) == 1, 0);
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
        let program = table::borrow(&factory.programs, 1);
        assert!(vector::length(&program.tiers) == 1, 0);
        let tier = vector::borrow(&program.tiers, 0);
        assert!(tier.name == utf8(b"Bronze"), 1);
        assert!(tier.stamps_required == 100, 2);
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
        let program = table::borrow(&factory.programs, 1);
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
        let program = table::borrow(&factory.programs, 1);
        let tier = vector::borrow(&program.tiers, 0);
        assert!(tier.name == utf8(b"New Bronze"), 0);
        assert!(tier.stamps_required == 150, 1);
        assert!(vector::length(&tier.benefits) == 2, 2);
        assert!(*vector::borrow(&tier.benefits, 0) == utf8(b"New Benefit 1"), 3);
        assert!(*vector::borrow(&tier.benefits, 1) == utf8(b"New Benefit 2"), 4);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_earn_stamps(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 10); // 10 stamps earned
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        
        // Checks if the customer's stamp count is 10 after earning 10 stamps
        assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 10, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_redeem_coupon(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        create_coupon(owner, 1, 10, utf8(b"Test Coupon"), true, 100, timestamp::now_seconds() + 60 * 60 * 24 * 7, 1);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 10);
        
        redeem_coupon(owner, 1, address_of(customer), 0);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Checks if the customer's stamp count is 0 after redeeming a coupon
        assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 0, 0);
    }

    // This should fail due to coupon expiration
    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    #[expected_failure(abort_code = E_COUPON_EXPIRED)]
    public fun test_coupon_expiration(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let current_time = timestamp::now_seconds();
        create_coupon(owner, 1, 10, utf8(b"Expired Coupon"), true, 100, current_time + 10, 1);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 10);        
        // Advance time by 11 seconds to make the coupon expire
        timestamp::fast_forward_seconds(11);
        
        // This should fail due to coupon expiration
        redeem_coupon(owner, 1, address_of(customer), 0);
    }

    // First redemption should succeed
    // Second redemption should fail due to reaching the redemption limit
    #[test(fx = @aptos_framework, owner = @0x123, customer1 = @0x456, customer2 = @0x789)]
    #[expected_failure(abort_code = E_COUPON_LIMIT_REACHED)]
    public fun test_coupon_redemption_limit(fx: &signer, owner: &signer, customer1: &signer, customer2: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let current_time = timestamp::now_seconds();
        create_coupon(owner, 1, 10, utf8(b"Limited Coupon"), true, 100, current_time + 3600, 1);
        
        account::create_account_for_test(address_of(customer1));
        account::create_account_for_test(address_of(customer2));
        earn_stamps(owner, 1, address_of(customer1), 10);
        earn_stamps(owner, 1, address_of(customer2), 10);
        
        // First redemption
        redeem_coupon(owner, 1, address_of(customer1), 0);
        
        // Second redemption
        redeem_coupon(owner, 1, address_of(customer2), 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_edit_loyalty_program(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let new_name = option::some(utf8(b"Updated Program"));
        let new_stamp_validity_days = option::some(45);
        
        edit_loyalty_program(owner, 1, new_name, new_stamp_validity_days);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        
        // Check if the program details were updated correctly
        assert!(program.name == utf8(b"Updated Program"), 0);
        assert!(program.stamp_validity_days == 45, 1);
    }

    // Test editing only some fields
    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_edit_loyalty_program_partial(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30);
        
        let new_name = option::some(utf8(b"Updated Program"));
        let new_stamp_validity_days = option::none();
        
        edit_loyalty_program(owner, 1, new_name, new_stamp_validity_days);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        
        // Check if only the name was updated
        assert!(program.name == utf8(b"Updated Program"), 0);
        assert!(program.stamp_validity_days == 30, 1); // Should remain unchanged
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_stamp_expiration(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30); // 30 days validity
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 10); // Earn 10 stamps
        
        {
            let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
            let program = table::borrow(&factory.programs, 1);
            assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 10, 0);
        }; // Release the borrow here
        
        // Fast forward time by 31 days (1 day more than validity period)
        timestamp::fast_forward_seconds(31 * 24 * 60 * 60);
        
        // Earn more stamps, which should trigger expiration check
        earn_stamps(owner, 1, address_of(customer), 5);
        
        {
            let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
            let program = table::borrow(&factory.programs, 1);
            // Check if stamps were reset to 5 (new stamps) instead of 15 (10 + 5)
            assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 5, 1);
        };
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_stamp_validity(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), 30); // 30 days validity
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 10); // Earn 10 stamps
        
        // Fast forward time by 29 days (1 day less than validity period)
        timestamp::fast_forward_seconds(29 * 24 * 60 * 60);
        
        // Earn more stamps
        earn_stamps(owner, 1, address_of(customer), 5);
        
        {
            let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
            let program = table::borrow(&factory.programs, 1);
            // Check if stamps were added correctly (10 + 5)
            assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 15, 0);
            
            // Check if last_stamp_date was updated
            assert!(*table::borrow(&program.customer_last_stamp_date, address_of(customer)) == timestamp::now_seconds(), 1);
        };
    }
}