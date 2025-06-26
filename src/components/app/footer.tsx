"use client";

import { useEffect, useState } from "react";

export function AppFooter() {
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    return (
        <footer className="py-6 border-t">
            <div className="container mx-auto text-center text-sm text-muted-foreground">
                © {year} VisuaLearn. All Rights Reserved.
            </div>
        </footer>
    );
}
