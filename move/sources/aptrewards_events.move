module aptrewards_addr::AptRewardsEvents {
    use aptos_framework::event;
    use std::string::String;
    friend aptrewards_addr::AptRewardsMain;

    #[event]
    struct CreateLoyaltyProgram has store, drop {
        program_id: u64,
        owner: address,
        point_validity_days: u64
    }

    #[event]
    struct TransferOwnership has store, drop {
        program_id: u64,
        old_owner: address,
        new_owner: address,
    }

    #[event]
    struct CreateVoucher has store, drop {
        program_id: u64,
        voucher_id: u64,
        points_required: u64,
        description: String,
        expiration_date: u64,
        max_redemptions: u64,
    }

    #[event]
    struct EarnPoints has store, drop {
        program_id: u64,
        customer: address,
        amount: u64,
    }

    #[event]
    struct RedeemVoucher has store, drop {
        program_id: u64,
        customer: address,
        voucher_id: u64,
        current_redemptions: u64,
        description: String,
    }

    #[event]
    struct AddTier has drop, store {
        program_id: u64,
        tier_id: u64,
        name: String,
        benefits: vector<String>,
        points_required: u64,
    }

    #[event]
    struct RemoveTier has store, drop {
        program_id: u64,
        tier_id: u64,
        name: String,
    }

    #[event]
    struct EditTier has drop, store {
        program_id: u64,
        tier_id: u64,
        new_name: String,
        new_benefits: vector<String>,
        new_points_required: u64,
    }

    #[event]
    struct EditLoyaltyProgram has store, drop {
        program_id: u64,
        new_name: String,
        new_point_validity_days: u64,
    }

    public(friend) fun emit_create_loyalty_program(
        program_id: u64, 
        owner: address,
        point_validity_days: u64
    ) {
        event::emit(CreateLoyaltyProgram { 
            program_id,
            owner,
            point_validity_days
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

    public(friend) fun emit_create_voucher(
        program_id: u64, 
        voucher_id: u64,
        points_required: u64,
        description: String,
        expiration_date: u64,
        max_redemptions: u64
    ) {
        event::emit(CreateVoucher { 
            program_id, 
            voucher_id,
            points_required,
            description,
            expiration_date,
            max_redemptions
        });
    }

    public(friend) fun emit_earn_points(
        program_id: u64, 
        customer: address, 
        amount: u64
    ) {
        event::emit(EarnPoints { 
            program_id, 
            customer, 
            amount 
        });
    }

    public(friend) fun emit_redeem_voucher(
        program_id: u64, 
        customer: address, 
        voucher_id: u64,
        current_redemptions: u64,
        description: String
    ) {
        event::emit(RedeemVoucher { 
            program_id, 
            customer, 
            voucher_id,
            current_redemptions,
            description
        });
    }

    public(friend) fun emit_add_tier(
        program_id: u64,
        tier_id: u64,
        name: String,
        benefits: vector<String>,
        points_required: u64
    ) {
        event::emit(AddTier { 
            program_id,
            tier_id,
            name,
            benefits,
            points_required
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
        new_benefits: vector<String>,
        new_points_required: u64
    ) {
        event::emit(EditTier { 
            program_id,
            tier_id,
            new_name,
            new_benefits,
            new_points_required
        });
    }

    public(friend) fun emit_edit_loyalty_program(
        program_id: u64,
        new_name: String,
        new_point_validity_days: u64
    ) {
        event::emit(EditLoyaltyProgram {
            program_id,
            new_name,
            new_point_validity_days
        });
    }
}