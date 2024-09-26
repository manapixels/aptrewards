import RewardsSummary from "@/components/customer/RewardsSummary";
import { Metadata } from "next";
import { appName } from "@/constants";

export const metadata: Metadata = {
    title: `${appName} | Rewards Summary`,
}

export default function LoyaltyProgramPage({ params }: { params: { id: string } }) {
    return (
        <div>
            <RewardsSummary loyaltyProgramId={params.id} />
        </div>
    );
}