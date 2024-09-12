module aptrewards_addr::AptRewardsMain {
    use aptos_framework::randomness;
    use aptos_std::table::{Self, Table};
    use std::vector;
    use aptrewards_addr::AptRewardsEvents::{Self, emit_create_loyalty_program};
    use std::signer::address_of;
    use std::string::{String,utf8};
    use std::timestamp;
    use std::option::{Self, Option};

    struct Coupon has store {
        id: u64,
        stamps_required: u64,
        description: String,
        is_monetary: bool,
        value: u64,
        expiration_date: u64, // Unix timestamp
        max_redemptions: u64,
        current_redemptions: u64,
    }

    struct Tier has store, copy, drop {
        id: u64,
        name: String,
        description: String,
        stamps_required: u64,
    }

    struct LoyaltyProgram has store {
        id: u64,
        name: String,
        spin_probabilities: vector<u64>,
        spin_amounts: vector<u64>,
        coupons: vector<Coupon>,
        customer_stamps: Table<address, u64>,
        customer_lifetime_stamps: Table<address, u64>,
        tiers: vector<Tier>,
        lucky_spin_enabled: bool,
        owner: address,
        coupon_count: u64,
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
    const E_LUCKY_SPIN_DISABLED: u64 = 9;
    const E_INSUFFICIENT_STAMPS_FOR_SPIN: u64 = 10;
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

    public entry fun create_loyalty_program(sender: &signer, name: String, lucky_spin_enabled: bool) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program_id = factory.program_count + 1;
        let owner_address = address_of(sender);

        let program = LoyaltyProgram {
            id: program_id,
            name,
            spin_probabilities: vector::empty(),
            spin_amounts: vector::empty(),
            coupons: vector::empty(),
            customer_stamps: table::new(),
            customer_lifetime_stamps: table::new(),
            tiers: vector::empty(),
            lucky_spin_enabled,
            owner: owner_address,
            coupon_count: 0,
        };

        table::add(&mut factory.programs, program_id, program);
        factory.program_count = program_id;

        if (!table::contains(&factory.user_programs, owner_address)) {
            table::add(&mut factory.user_programs, owner_address, vector::empty<u64>());
        };
        let user_programs = table::borrow_mut(&mut factory.user_programs, owner_address);
        vector::push_back(user_programs, program_id);

        emit_create_loyalty_program(program_id, owner_address);
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

    public entry fun set_spin_probabilities(sender: &signer, program_id: u64, probabilities: vector<u64>, amounts: vector<u64>) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        program.spin_probabilities = probabilities;
        program.spin_amounts = amounts;

        AptRewardsEvents::emit_set_spin_probabilities(program_id, probabilities);
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
        description: String,
        stamps_required: u64
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        
        let tier_id = vector::length(&program.tiers);
        let new_tier = Tier {
            id: tier_id,
            name,
            description,
            stamps_required,
        };
        vector::push_back(&mut program.tiers, new_tier);

        AptRewardsEvents::emit_add_tier(program_id, tier_id, name, description, stamps_required);
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
        new_description: String,
        new_stamps_required: u64
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);
        assert!(tier_id < vector::length(&program.tiers), E_TIER_NOT_FOUND);

        let tier = vector::borrow_mut(&mut program.tiers, tier_id);
        tier.name = new_name;
        tier.description = new_description;
        tier.stamps_required = new_stamps_required;

        AptRewardsEvents::emit_edit_tier(program_id, tier_id, new_name, new_description, new_stamps_required);
    }

    public entry fun earn_stamps(admin: &signer, program_id: u64, customer: address, amount: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow_mut(&mut factory.programs, program_id);
        
        // Check if the caller is the owner of the loyalty program
        assert!(program.owner == address_of(admin), E_NOT_OWNER);

        let stamps = amount / 10; // Assuming 1 stamp per $10 spent
        
        // Update customer_stamps
        if (!table::contains(&program.customer_stamps, customer)) {
            table::add(&mut program.customer_stamps, customer, stamps);
        } else {
            let customer_stamps = table::borrow_mut(&mut program.customer_stamps, customer);
            *customer_stamps = *customer_stamps + stamps;
        };

        // Update customer_lifetime_stamps
        if (!table::contains(&program.customer_lifetime_stamps, customer)) {
            table::add(&mut program.customer_lifetime_stamps, customer, stamps);
        } else {
            let customer_lifetime_stamps = table::borrow_mut(&mut program.customer_lifetime_stamps, customer);
            *customer_lifetime_stamps = *customer_lifetime_stamps + stamps;
        };

        AptRewardsEvents::emit_earn_stamps(program_id, customer, stamps);
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
        
        let customer_stamps = table::borrow_mut(&mut program.customer_stamps, customer);
        assert!(*customer_stamps >= coupon.stamps_required, E_INSUFFICIENT_STAMPS);
        
        *customer_stamps = *customer_stamps - coupon.stamps_required;
        coupon.current_redemptions = coupon.current_redemptions + 1;
        
        AptRewardsEvents::emit_redeem_coupon(program_id, customer, coupon_id, coupon.current_redemptions, coupon.description, coupon.value);
    }

    // Simulates a lucky spin for customers
    // Because this function calls random it must not be public.
    // This ensures user can only call it from a transaction instead of another contract.
    #[randomness]
    entry fun lucky_spin(sender: &signer, program_id: u64) acquires LoyaltyProgramFactory {
        let customer = address_of(sender);
        lucky_spin_internal(program_id, customer);
    }

    fun lucky_spin_internal(program_id: u64, customer: address) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(table::contains(&factory.programs, program_id), E_PROGRAM_NOT_FOUND);
        
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.lucky_spin_enabled, E_LUCKY_SPIN_DISABLED);
        
        // Generate a random u64 number between 0 and 100
        let random_u64 = randomness::u64_range(0, 101);
        
        let cumulative_probability: u64 = 0;
        let winning_amount: u64 = 0;

        let i = 0;
        let len = vector::length(&program.spin_probabilities);
        while (i < len) {
            cumulative_probability = cumulative_probability + *vector::borrow(&program.spin_probabilities, i);
            if (random_u64 < cumulative_probability) {
                winning_amount = *vector::borrow(&program.spin_amounts, i);
                break
            };
            i = i + 1;
        };

        if (winning_amount > 0) {
            let coupon_id: u64 = program.coupon_count;
            program.coupon_count = program.coupon_count + 1;
            let coupon = Coupon {
                id: coupon_id,
                stamps_required: 0,
                description: utf8(b"Spin Win"),
                is_monetary: true,
                value: winning_amount,
                expiration_date: timestamp::now_seconds() + 60 * 60 * 24 * 7, // 7 days from now
                max_redemptions: 1,
                current_redemptions: 0,
            };
            vector::push_back(&mut program.coupons, coupon);
            // Add the coupon to the customer's stamps
            let current_stamps = table::borrow_mut_with_default(&mut program.customer_stamps, customer, 0);
            *current_stamps = *current_stamps + 1;
        };

        AptRewardsEvents::emit_spin_lucky_wheel(program_id, customer, winning_amount);
    }

    // Updated struct to include all program details
    struct ProgramDetails has drop, copy {
        id: u64,
        name: String,
        spin_probabilities: vector<u64>,
        spin_amounts: vector<u64>,
        tiers: vector<Tier>,
        lucky_spin_enabled: bool,
        owner: address,
    }

    #[view]
    public fun get_loyalty_program_details(program_id: u64): ProgramDetails acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(table::contains(&factory.programs, program_id), E_PROGRAM_NOT_FOUND);
        
        let program = table::borrow(&factory.programs, program_id);
        
        ProgramDetails {
            id: program.id,
            name: program.name,
            owner: program.owner,
            spin_probabilities: program.spin_probabilities,
            spin_amounts: program.spin_amounts,
            tiers: program.tiers,
            lucky_spin_enabled: program.lucky_spin_enabled,
        }
 
    }

    struct ProgramInfo has drop, copy {
        id: u64,
        name: String,
    }

    #[view]
    public fun get_owned_loyalty_programs(owner: address): vector<ProgramInfo> acquires LoyaltyProgramFactory {
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        if (table::contains(&factory.user_programs, owner)) {
            let program_ids = table::borrow(&factory.user_programs, owner);
            let result = vector::empty<ProgramInfo>();
            let i = 0;
            let len = vector::length(program_ids);
            while (i < len) {
                let program_id = *vector::borrow(program_ids, i);
                let program = table::borrow(&factory.programs, program_id);
                vector::push_back(&mut result, ProgramInfo { id: program_id, name: program.name });
                i = i + 1;
            };
            result
        } else {
            vector::empty<ProgramInfo>()
        }
    }

    public entry fun edit_loyalty_program(
        sender: &signer,
        program_id: u64,
        new_name: Option<String>,
        new_lucky_spin_enabled: Option<bool>,
        new_spin_probabilities: Option<vector<u64>>,
        new_spin_amounts: Option<vector<u64>>
    ) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(@aptrewards_addr);
        assert!(table::contains(&factory.programs, program_id), E_PROGRAM_NOT_FOUND);
        
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(sender), E_NOT_OWNER);

        if (option::is_some(&new_name)) {
            program.name = option::extract(&mut new_name);
        };

        if (option::is_some(&new_lucky_spin_enabled)) {
            program.lucky_spin_enabled = option::extract(&mut new_lucky_spin_enabled);
        };

        if (option::is_some(&new_spin_probabilities) && option::is_some(&new_spin_amounts)) {
            let probabilities = option::extract(&mut new_spin_probabilities);
            let amounts = option::extract(&mut new_spin_amounts);
            assert!(vector::length(&probabilities) == vector::length(&amounts), E_INVALID_SPIN_CONFIG);
            program.spin_probabilities = probabilities;
            program.spin_amounts = amounts;
        } else {
            assert!(option::is_none(&new_spin_probabilities) && option::is_none(&new_spin_amounts), E_INVALID_SPIN_CONFIG);
        };

        AptRewardsEvents::emit_edit_loyalty_program(
            program_id,
            program.name,
            program.lucky_spin_enabled,
            program.spin_probabilities,
            program.spin_amounts
        );
    }

    /////////////////////////// Tests //////////////////////////////////
    #[test_only]
    use aptos_framework::account;
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
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        // Checks if the program count in the factory is equal to 1, indicating a single program was created successfully.
        assert!(factory.program_count == 1, 0);

        // Checks if the program with ID 1 exists in the factory's programs table, indicating it was successfully created and stored.
        assert!(table::contains(&factory.programs, 1), 1);
    }

    #[test(fx = @aptos_framework, owner = @0x123, new_owner = @0x456)]
    public fun test_transfer_ownership(fx: &signer, owner: &signer, new_owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        account::create_account_for_test(address_of(new_owner));
        transfer_ownership(owner, 1, address_of(new_owner));
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Checks if the program owner has been successfully transferred to the new owner
        assert!(program.owner == address_of(new_owner), 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_set_spin_probabilities(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let probabilities = vector<u64>[25, 25, 50];
        let amounts = vector<u64>[10, 20, 0];
        set_spin_probabilities(owner, 1, probabilities, amounts);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Checks if the spin probabilities set for the program match the expected probabilities
        assert!(program.spin_probabilities == probabilities, 0);
        // Checks if the spin amounts set for the program match the expected amounts
        assert!(program.spin_amounts == amounts, 1);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_create_coupon(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        create_coupon(owner, 1, 10, utf8(b"Test Coupon"), true, 100, timestamp::now_seconds() + 60 * 60 * 24 * 7, 1);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Checks if the length of the merchant's coupons vector is equal to 1, indicating a single coupon was created successfully.
        assert!(vector::length(&program.coupons) == 1, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_add_tier(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        add_tier(owner, 1, utf8(b"Bronze"), utf8(b"Entry level tier"), 100);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        assert!(vector::length(&program.tiers) == 1, 0);
        let tier = vector::borrow(&program.tiers, 0);
        assert!(tier.name == utf8(b"Bronze"), 1);
        assert!(tier.description == utf8(b"Entry level tier"), 2);
        assert!(tier.stamps_required == 100, 3);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_remove_tier(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        add_tier(owner, 1, utf8(b"Bronze"), utf8(b"Entry level tier"), 100);
        add_tier(owner, 1, utf8(b"Silver"), utf8(b"Mid level tier"), 200);
        
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
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        add_tier(owner, 1, utf8(b"Bronze"), utf8(b"Entry level tier"), 100);
        
        edit_tier(owner, 1, 0, utf8(b"New Bronze"), utf8(b"Updated entry level"), 150);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        let tier = vector::borrow(&program.tiers, 0);
        assert!(tier.name == utf8(b"New Bronze"), 0);
        assert!(tier.description == utf8(b"Updated entry level"), 1);
        assert!(tier.stamps_required == 150, 2);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_earn_stamps(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 100); // $100 spent
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        
        // Checks if the customer's stamp count is 10 after spending $100 (1 stamp per $10)
        assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 10, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_redeem_coupon(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        create_coupon(owner, 1, 10, utf8(b"Test Coupon"), true, 100, timestamp::now_seconds() + 60 * 60 * 24 * 7, 1);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 100);
        
        redeem_coupon(owner, 1, address_of(customer), 0);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Checks if the customer's stamp count is 0 after redeeming a coupon
        assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 0, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_lucky_spin(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let probabilities = vector<u64>[100];
        let amounts = vector<u64>[10];
        set_spin_probabilities(owner, 1, probabilities, amounts);
        
        account::create_account_for_test(address_of(customer));
        lucky_spin(customer, 1);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        // Asserts that the customer has 1 stamp after the lucky spin
        assert!(*table::borrow(&program.customer_stamps, address_of(customer)) == 1, 0);
        // Asserts that there is 1 coupon in the merchant's coupons vector
        assert!(vector::length(&program.coupons) == 1, 1);
    }

    // This should fail due to coupon expiration
    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    #[expected_failure(abort_code = E_COUPON_EXPIRED)]
    public fun test_coupon_expiration(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let current_time = timestamp::now_seconds();
        create_coupon(owner, 1, 10, utf8(b"Expired Coupon"), true, 100, current_time + 10, 1);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 100);        
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
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let current_time = timestamp::now_seconds();
        create_coupon(owner, 1, 10, utf8(b"Limited Coupon"), true, 100, current_time + 3600, 1);
        
        account::create_account_for_test(address_of(customer1));
        account::create_account_for_test(address_of(customer2));
        earn_stamps(owner, 1, address_of(customer1), 100);
        earn_stamps(owner, 1, address_of(customer2), 100);
        
        // First redemption
        redeem_coupon(owner, 1, address_of(customer1), 0);
        
        // Second redemption
        redeem_coupon(owner, 1, address_of(customer2), 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_lucky_spin_coupon_creation(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let probabilities = vector<u64>[100];
        let amounts = vector<u64>[10];
        set_spin_probabilities(owner, 1, probabilities, amounts);
        
        account::create_account_for_test(address_of(customer));
        lucky_spin(customer, 1);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        let coupon = vector::borrow(&program.coupons, 0);
        
        // Check if the coupon created by lucky spin has the correct properties
        assert!(coupon.stamps_required == 0, 0);
        assert!(coupon.description == utf8(b"Spin Win"), 1);
        assert!(coupon.is_monetary == true, 2);
        assert!(coupon.value == 10, 3);
        assert!(coupon.max_redemptions == 1, 4);
        assert!(coupon.current_redemptions == 0, 5);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_edit_loyalty_program(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let new_name = option::some(utf8(b"Updated Program"));
        let new_lucky_spin_enabled = option::some(false);
        let new_spin_probabilities = option::some(vector<u64>[30, 30, 40]);
        let new_spin_amounts = option::some(vector<u64>[5, 10, 15]);
        
        edit_loyalty_program(owner, 1, new_name, new_lucky_spin_enabled, new_spin_probabilities, new_spin_amounts);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        
        // Check if the program details were updated correctly
        assert!(program.name == utf8(b"Updated Program"), 0);
        assert!(program.lucky_spin_enabled == false, 1);
        assert!(program.spin_probabilities == vector<u64>[30, 30, 40], 2);
        assert!(program.spin_amounts == vector<u64>[5, 10, 15], 3);
    }

    // Test editing only some fields
    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_edit_loyalty_program_partial(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let new_name = option::some(utf8(b"Updated Program"));
        let new_lucky_spin_enabled = option::none();
        let new_spin_probabilities = option::none();
        let new_spin_amounts = option::none();
        
        edit_loyalty_program(owner, 1, new_name, new_lucky_spin_enabled, new_spin_probabilities, new_spin_amounts);
        
        let factory = borrow_global<LoyaltyProgramFactory>(@aptrewards_addr);
        let program = table::borrow(&factory.programs, 1);
        
        // Check if only the name was updated
        assert!(program.name == utf8(b"Updated Program"), 0);
        assert!(program.lucky_spin_enabled == true, 1); // Should remain unchanged
        assert!(vector::is_empty(&program.spin_probabilities), 2); // Should remain empty
        assert!(vector::is_empty(&program.spin_amounts), 3); // Should remain empty
    }

    // Test editing with invalid spin configuration
    #[test(fx = @aptos_framework, owner = @0x123)]
    #[expected_failure(abort_code = E_INVALID_SPIN_CONFIG)]
    public fun test_edit_loyalty_program_invalid_spin_config(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let new_name = option::none();
        let new_lucky_spin_enabled = option::none();
        let new_spin_probabilities = option::some(vector<u64>[30, 30, 40]);
        let new_spin_amounts = option::some(vector<u64>[5, 10]); // Different length from probabilities
        
        edit_loyalty_program(owner, 1, new_name, new_lucky_spin_enabled, new_spin_probabilities, new_spin_amounts);
    }
}