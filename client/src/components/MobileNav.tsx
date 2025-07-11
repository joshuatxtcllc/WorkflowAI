
import React from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Menu, Home, BarChart3, Users, Settings } from 'lucide-react';

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-gray-900 border-gray-800">
        <div className="flex flex-col space-y-4 mt-8">
          <Button variant="ghost" className="justify-start">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="ghost" className="justify-start">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button variant="ghost" className="justify-start">
            <Users className="mr-2 h-4 w-4" />
            Customers
          </Button>
          <Button variant="ghost" className="justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
