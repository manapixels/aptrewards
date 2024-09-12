module aptrewards_addr::AptRewardsEvents {
    use aptos_framework::event;
    use std::string::String;
    friend aptrewards_addr::AptRewardsMain;

    #[event]
    struct CreateLoyaltyProgram has store, drop {
        program_id: u64,
        owner: address,
    }

    #[event]
    struct TransferOwnership has store, drop {
        program_id: u64,
        old_owner: address,
        new_owner: address,
    }

    // Comment out or remove the SetSpinProbabilities event

    // Comment out or remove the SpinLuckyWheel event

    #[event]
    struct CreateCoupon has store, drop {
        program_id: u64,
        coupon_id: u64,
        stamps_required: u64,
        description: String,
        is_monetary: bool,
        value: u64,
        expiration_date: u64,
        max_redemptions: u64,
    }

    #[event]
    struct SetTierThresholds has store, drop {
        program_id: u64,
        thresholds: vector<u64>,
    }

    #[event]
    struct EarnStamps has store, drop {
        program_id: u64,
        customer: address,
        amount: u64,
    }

    #[event]
    struct RedeemCoupon has store, drop {
        program_id: u64,
        customer: address,
        coupon_id: u64,
        current_redemptions: u64,
        description: String,
        value: u64,
    }

    // Comment out or remove the SpinLuckyWheel event

    #[event]
    struct AddTier has store, drop {
        program_id: u64,
        tier_id: u64,
        name: String,
        description: String,
        stamps_required: u64,
    }

    #[event]
    struct RemoveTier has store, drop {
        program_id: u64,
        tier_id: u64,
        name: String,
    }

    #[event]
    struct EditTier has store, drop {
        program_id: u64,
        tier_id: u64,
        new_name: String,
        new_description: String,
        new_stamps_required: u64,
    }

    #[event]
    struct EditLoyaltyProgram has store, drop {
        program_id: u64,
        new_name: String,
        // new_lucky_spin_enabled: bool,
        // new_spin_probabilities: vector<u64>,
        // new_spin_amounts: vector<u64>,
        new_dollars_per_stamp: u64,
    }

    public(friend) fun emit_create_loyalty_program(
        program_id: u64, 
        owner: address
    ) {
        event::emit(CreateLoyaltyProgram { 
            program_id,
            owner
        });
    }

    public(friend) fun emit_transfer_ownership(
        program_id: u64, 
        old_owner: address, 
        new_owner: address
    ) {
        event::emit(TransferOwnership { 
            program_id, 
            old_owner, 
            new_owner 
        });
    }

    // Comment out or remove the emit_set_spin_probabilities function

    // Comment out or remove the emit_spin_lucky_wheel function

    public(friend) fun emit_create_coupon(
        program_id: u64, 
        coupon_id: u64,
        stamps_required: u64,
        description: String,
        is_monetary: bool,
        value: u64,
        expiration_date: u64,
        max_redemptions: u64
    ) {
        event::emit(CreateCoupon { 
            program_id, 
            coupon_id,
            stamps_required,
            description,
            is_monetary,
            value,
            expiration_date,
            max_redemptions
        });
    }

    public(friend) fun emit_set_tier_thresholds(
        program_id: u64,
        thresholds: vector<u64>
    ) {
        event::emit(SetTierThresholds { 
            program_id,
            thresholds
        });
    }

    public(friend) fun emit_earn_stamps(
        program_id: u64, 
        customer: address, 
        amount: u64
    ) {
        event::emit(EarnStamps { 
            program_id, 
            customer, 
            amount 
        });
    }

    public(friend) fun emit_redeem_coupon(
        program_id: u64, 
        customer: address, 
        coupon_id: u64,
        current_redemptions: u64,
        description: String,
        value: u64
    ) {
        event::emit(RedeemCoupon { 
            program_id, 
            customer, 
            coupon_id,
            current_redemptions,
            description,
            value
        });
    }

    // Comment out or remove the emit_spin_lucky_wheel function

    public(friend) fun emit_add_tier(
        program_id: u64,
        tier_id: u64,
        name: String,
        description: String,
        stamps_required: u64
    ) {
        event::emit(AddTier { 
            program_id,
            tier_id,
            name,
            description,
            stamps_required
        });
    }

    public(friend) fun emit_remove_tier(
        program_id: u64,
        tier_id: u64,
        name: String
    ) {
        event::emit(RemoveTier { 
            program_id,
            tier_id,
            name
        });
    }

    public(friend) fun emit_edit_tier(
        program_id: u64,
        tier_id: u64,
        new_name: String,
        new_description: String,
        new_stamps_required: u64
    ) {
        event::emit(EditTier { 
            program_id,
            tier_id,
            new_name,
            new_description,
            new_stamps_required
        });
    }

    public(friend) fun emit_edit_loyalty_program(
        program_id: u64,
        new_name: String,
        // new_lucky_spin_enabled: bool,
        // new_spin_probabilities: vector<u64>,
        // new_spin_amounts: vector<u64>,
        new_dollars_per_stamp: u64
    ) {
        event::emit(EditLoyaltyProgram {
            program_id,
            new_name,
            // new_lucky_spin_enabled,
            // new_spin_probabilities,
            // new_spin_amounts,
            new_dollars_per_stamp
        });
    }
}