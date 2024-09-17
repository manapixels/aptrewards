import RewardsSummary from "@/components/customer/RewardsSummary";

export default function LoyaltyProgramPage({ params }: { params: { id: string } }) {
    return (
        <RewardsSummary loyaltyProgramId={params.id} />
    );
}