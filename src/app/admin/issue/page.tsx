import { Metadata } from "next";
import { appName } from "@/constants";
import AdminFrontend from '@/components/admin/issue/AdminFrontend';

export const metadata: Metadata = {
    title: `${appName} | Issue Points & Redeem Vouchers`,
}

const IssuePage = () => {

    return (
        <div>
            <AdminFrontend />
        </div>
    );
};

export default IssuePage;
