module aptrewards_addr::AptRewardsMain {
    use aptos_framework::randomness;
    use aptos_std::table::{Self, Table};
    use std::vector;
    use aptrewards_addr::AptRewardsEvents::{Self, emit_create_loyalty_program};
    use std::signer::address_of;
    use std::string::{String,utf8};

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
        description: String,
        is_monetary: bool,
        value: u64,
    }

    struct LoyaltyProgram has store {
        id: u64,
        name: String,
        merchant: Merchant,
        lucky_spin_enabled: bool,
        owner: address,
    }

    struct LoyaltyProgramFactory has key {
        programs: Table<u64, LoyaltyProgram>,
        program_count: u64,
        user_programs: Table<address, vector<u64>>,
    }

    const E_NOT_OWNER: u64 = 1;
    const E_PROGRAM_NOT_FOUND: u64 = 2;

    #[view]
    public fun is_factory_initialized(account: address): bool {
        exists<LoyaltyProgramFactory>(account)
    }

    public entry fun initialize_factory(account: &signer) {
        let factory = LoyaltyProgramFactory {
            programs: table::new(),
            program_count: 0,
            user_programs: table::new(),
        };
        move_to(account, factory);
    }

    public entry fun create_loyalty_program(account: &signer, name: String, lucky_spin_enabled: bool) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(account));
        let program_id = factory.program_count + 1;
        let owner_address = address_of(account);

        let merchant = Merchant {
            balance: 0,
            spin_probabilities: vector::empty(),
            spin_amounts: vector::empty(),
            coupons: vector::empty(),
            customer_stamps: table::new(),
            customer_lifetime_stamps: table::new(),
            tier_thresholds: vector::empty(),
        };

        let program = LoyaltyProgram {
            id: program_id,
            name,
            merchant,
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

        emit_create_loyalty_program(program_id, owner_address);
    }

    public entry fun transfer_ownership(account: &signer, program_id: u64, new_owner: address) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        let old_owner = program.owner;
        assert!(old_owner == address_of(account), E_NOT_OWNER);

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

    public entry fun set_spin_probabilities(account: &signer, program_id: u64, probabilities: vector<u64>, amounts: vector<u64>) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(account), E_NOT_OWNER);
        program.merchant.spin_probabilities = probabilities;
        program.merchant.spin_amounts = amounts;

        AptRewardsEvents::emit_set_spin_probabilities(program_id, probabilities);
    }

    public entry fun create_coupon(account: &signer, program_id: u64, id: u64, stamps_required: u64, description: String, is_monetary: bool, value: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(account), E_NOT_OWNER);
        let merchant = &mut program.merchant;
        let coupon = Coupon {
            id,
            stamps_required,
            description,
            is_monetary,
            value,
        };
        vector::push_back(&mut merchant.coupons, coupon);

        AptRewardsEvents::emit_create_coupon(program_id, id, stamps_required, description, is_monetary, value);
    }

    public entry fun set_tier_thresholds(account: &signer, program_id: u64, thresholds: vector<u64>) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.owner == address_of(account), E_NOT_OWNER);
        let merchant = &mut program.merchant;
        merchant.tier_thresholds = thresholds;

        AptRewardsEvents::emit_set_tier_thresholds(program_id, thresholds);
    }

    public entry fun earn_stamps(admin: &signer, program_id: u64, customer: address, amount: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(admin));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        let merchant = &mut program.merchant;
        let stamps = amount / 10; // Assuming 1 stamp per $10 spent
        table::add(&mut merchant.customer_stamps, customer, stamps);
        table::add(&mut merchant.customer_lifetime_stamps, customer, stamps);

        AptRewardsEvents::emit_earn_stamps(program_id, customer, stamps);
    }

    public entry fun redeem_coupon(account: &signer, program_id: u64, customer: address, coupon_id: u64) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        let merchant = &mut program.merchant;
        let coupon = vector::borrow<Coupon>(&merchant.coupons, coupon_id);
        let customer_stamps = table::borrow_mut(&mut merchant.customer_stamps, customer);
        assert!(*customer_stamps >= coupon.stamps_required, 1);
        *customer_stamps = *customer_stamps - coupon.stamps_required;

        AptRewardsEvents::emit_redeem_coupon(program_id, customer, coupon_id);
    }

    // Simulates a lucky spin for customers
    // Because this function calls random it must not be public.
    // This ensures user can only call it from a transaction instead of another contract.
    #[randomness]
    entry fun lucky_spin(account: &signer, program_id: u64, customer: address) acquires LoyaltyProgramFactory {
        lucky_spin_internal(account, program_id, customer);
    }

    fun lucky_spin_internal(account: &signer, program_id: u64, customer: address) acquires LoyaltyProgramFactory {
        let factory = borrow_global_mut<LoyaltyProgramFactory>(address_of(account));
        let program = table::borrow_mut(&mut factory.programs, program_id);
        assert!(program.lucky_spin_enabled, 3);
        
        // Generate a random u64 number between 0 and 100
        let random_u64 = randomness::u64_range(0, 101);
        
        let cumulative_probability: u64 = 0;
        let winning_amount: u64 = 0;

        let i = 0;
        let len = vector::length(&program.merchant.spin_probabilities);
        while (i < len) {
            cumulative_probability = cumulative_probability + *vector::borrow(&program.merchant.spin_probabilities, i);
            if (random_u64 < cumulative_probability) {
                winning_amount = *vector::borrow(&program.merchant.spin_amounts, i);
                break
            };
            i = i + 1;
        };

        if (winning_amount > 0) {
            let coupon_id: u64 = vector::length(&program.merchant.coupons);
            let coupon = Coupon {
                id: coupon_id,
                stamps_required: 0,
                description: utf8(b"Spin Win"),
                is_monetary: true,
                value: winning_amount,
            };
            vector::push_back(&mut program.merchant.coupons, coupon);
            // Add the coupon to the customer's stamps
            let current_stamps = table::borrow_mut_with_default(&mut program.merchant.customer_stamps, customer, 0);
            *current_stamps = *current_stamps + 1;
        };

        AptRewardsEvents::emit_spin_lucky_wheel(program_id, customer, winning_amount);
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

        // create a fake account (only for testing purposes)
        account::create_account_for_test(address_of(owner));

        initialize_factory(owner);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_create_loyalty_program(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
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
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
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
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
        let program = table::borrow(&factory.programs, 1);
        // Checks if the spin probabilities set for the program match the expected probabilities
        assert!(program.merchant.spin_probabilities == probabilities, 0);
        // Checks if the spin amounts set for the program match the expected amounts
        assert!(program.merchant.spin_amounts == amounts, 1);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_create_coupon(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        create_coupon(owner, 1, 1, 10, utf8(b"Test Coupon"), true, 100);
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
        let program = table::borrow(&factory.programs, 1);
        // Checks if the length of the merchant's coupons vector is equal to 1, indicating a single coupon was created successfully.
        assert!(vector::length(&program.merchant.coupons) == 1, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123)]
    public fun test_set_tier_thresholds(fx: &signer, owner: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let thresholds = vector<u64>[100, 200, 300];
        set_tier_thresholds(owner, 1, thresholds);
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
        let program = table::borrow(&factory.programs, 1);
        // Checks if the tier thresholds set for the program match the expected thresholds
        assert!(program.merchant.tier_thresholds == thresholds, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_earn_stamps(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 100); // $100 spent
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
        let program = table::borrow(&factory.programs, 1);
        
        // Checks if the customer's stamp count is 10 after spending $100 (1 stamp per $10)
        assert!(*table::borrow(&program.merchant.customer_stamps, address_of(customer)) == 10, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_redeem_coupon(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        create_coupon(owner, 1, 1, 10, utf8(b"Test Coupon"), true, 100);
        
        account::create_account_for_test(address_of(customer));
        earn_stamps(owner, 1, address_of(customer), 100);
        
        redeem_coupon(owner, 1, address_of(customer), 0);
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
        let program = table::borrow(&factory.programs, 1);
        // Checks if the customer's stamp count is 0 after redeeming a coupon
        assert!(*table::borrow(&program.merchant.customer_stamps, address_of(customer)) == 0, 0);
    }

    #[test(fx = @aptos_framework, owner = @0x123, customer = @0x456)]
    public fun test_lucky_spin(fx: &signer, owner: &signer, customer: &signer) acquires LoyaltyProgramFactory {
        setup_test(fx, owner);
        create_loyalty_program(owner, utf8(b"Test Program"), true);
        
        let probabilities = vector<u64>[100];
        let amounts = vector<u64>[10];
        set_spin_probabilities(owner, 1, probabilities, amounts);
        
        account::create_account_for_test(address_of(customer));
        lucky_spin(owner, 1, address_of(customer));
        
        let factory = borrow_global<LoyaltyProgramFactory>(address_of(owner));
        let program = table::borrow(&factory.programs, 1);
        // Asserts that the customer has 1 stamp after the lucky spin
        assert!(*table::borrow(&program.merchant.customer_stamps, address_of(customer)) == 1, 0);
        // Asserts that there is 1 coupon in the merchant's coupons vector
        assert!(vector::length(&program.merchant.coupons) == 1, 1);
    }
}