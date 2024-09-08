import RewardsSummary from "@/components/customer/RewardsSummary";


export default function LoyaltyProgramPage({ params }: { params: { name: string } }) {

    return (
        <RewardsSummary loyaltyProgramId={params.name} />
    );
}