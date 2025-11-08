"use client";

import React, { useState } from "react";
import { Tabs, Tab } from "@heroui/tabs";
import { Button, ButtonGroup } from "@heroui/button";
import { 
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/dropdown";
import { 
    Download, 
    Filter, 
    SlidersHorizontal,
    Ticket,
    Check,
    ChevronDown,
} from "lucide-react";
    
interface CampaignToolbarProps {
    onExport?: () => void;
    onQuickFilter?: () => void;
    onAdvancedFilter?: () => void;
    onCreateEvent?: (eventType: string) => void;
    onTabChange?: (tab: string) => void;
    defaultTab?: string;
}
    
export default function CampaignToolbar({
    onExport,
    onQuickFilter,
    onAdvancedFilter,
    onCreateEvent,
    onTabChange,
    defaultTab = "all"
}: CampaignToolbarProps) {
    const [selectedTab, setSelectedTab] = useState(defaultTab);
    // Initialize with null first, then update in useEffect to avoid hydration mismatch
    const [selectedEventType, setSelectedEventType] = useState<Set<string> | null>(null);
    
    // Set initial value in useEffect to ensure it only runs on the client
    React.useEffect(() => {
        setSelectedEventType(new Set(["blood-drive"]));
    }, []);
    
    const handleSelectionChange = (keys: any) => {
        // Convert the selection to a Set<string>
        const newSelection = new Set<string>();
        if (keys === 'all') {
            // Handle 'all' selection if needed
            // newSelection.add('all');
        } else if (keys) {
            // Handle single selection (assuming single selection mode)
            const key = typeof keys === 'string' ? keys : keys.currentKey;
            if (key) {
                newSelection.add(key);
            }
        }
        setSelectedEventType(newSelection);
    };
    
    // Event type labels and descriptions
    type EventType = keyof {
        "blood-drive": string;
        training: string;
        advocacy: string;
    };
    
    const eventLabelsMap: Record<EventType, string> = {
        "blood-drive": "Blood Drive",
        "training": "Training",
        "advocacy": "Advocacy"
    };
    
    const eventDescriptionsMap: Record<EventType, string> = {
        "blood-drive": "Organize a blood donation event",
        "training": "Schedule a training session",
        "advocacy": "Create an advocacy campaign"
    };
    
    // Handle tab selection changes
    const handleTabChange = (key: React.Key) => {
        const tabKey = key.toString();
        setSelectedTab(tabKey);
        onTabChange?.(tabKey);
    };
    
    // Get selected event type value
    const selectedEventTypeValue = selectedEventType ? Array.from(selectedEventType)[0] as EventType : undefined;
    
    // Handle create event button click
    const handleCreateEvent = () => {
        if (selectedEventTypeValue) {
            onCreateEvent?.(selectedEventTypeValue);
        }
    };
    
    return (
        <div className="w-full bg-white">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Left side - Status Tabs */}
                <Tabs
                    radius="md"
                    size="sm"
                    selectedKey={selectedTab}
                    onSelectionChange={handleTabChange}
                    variant="solid"
                >
                    <Tab key="all" title="All" />
                    <Tab key="approved" title="Approved" />
                    <Tab key="pending" title="Pending" />
                    <Tab key="rejected" title="Rejected" />
                    <Tab key="finished" title="Finished" />
                </Tabs>
        
                {/* Right side - Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Export Button */}
                    <Button
                        variant="faded"
                        startContent={<Download className="w-4 h-4" />}
                        onPress={onExport}
                        radius="md"
                        size="sm"
                    >
                        Export
                    </Button>
        
                    {/* Quick Filter Button */}
                    <Button
                        variant="faded"
                        startContent={<Filter className="w-4 h-4" />}
                        endContent={<ChevronDown className="w-4 h-4"/>}
                        onPress={onQuickFilter}
                        radius="md"
                        size="sm"
                    >
                        Quick Filter
                    </Button>
        
                    {/* Advanced Filter Button */}
                    <Button
                        variant="faded"
                        startContent={<SlidersHorizontal className="w-4 h-4" />}
                        endContent={<ChevronDown className="w-4 h-4"/>}
                        onPress={onAdvancedFilter}
                        radius="md"
                        size="sm"
                    >
                        Advanced Filter
                    </Button>
        
                    {/* Create Event Button Group with Dropdown */}
                    <ButtonGroup 
                        variant="solid"
                        radius="md"
                        size="sm"
                    >
                        <Button
                            onPress={handleCreateEvent}
                            color="primary"
                            startContent={<Ticket className="w-4 h-4" />}
                        >
                            {selectedEventTypeValue ? eventLabelsMap[selectedEventTypeValue] : 'Create Event'}
                        </Button>
                        <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                                <Button 
                                    isIconOnly
                                    color="primary"
                                >
                                    <ChevronDown className="w-4 h-4"/>
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                aria-label="Event type options"
                                className="max-w-2xl"
                                selectedKeys={selectedEventType || new Set()}
                                selectionMode="single"
                                onSelectionChange={handleSelectionChange}
                            >
                                <DropdownItem 
                                    key="blood-drive" 
                                    description={eventDescriptionsMap["blood-drive"]}
                                >
                                    {eventLabelsMap["blood-drive"]}
                                </DropdownItem>
                                <DropdownItem 
                                    key="training" 
                                    description={eventDescriptionsMap["training"]}
                                >
                                    {eventLabelsMap["training"]}
                                </DropdownItem>
                                <DropdownItem 
                                    key="advocacy" 
                                    description={eventDescriptionsMap["advocacy"]}
                                >
                                    {eventLabelsMap["advocacy"]}
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </ButtonGroup>
                </div>
            </div>
        </div>
    );
}