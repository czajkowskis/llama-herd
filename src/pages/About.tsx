import React from 'react';
import { Icon } from '../components/ui/Icon';

// This page component displays information about the application.
export const About: React.FC = () => {
  return (
    <div className="p-8 animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <Icon className="text-purple-400 text-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></Icon>
          <h2 className="text-xl font-semibold text-white">What's LLaMa-Herd</h2>
        </div>
        <div className="text-gray-300 space-y-4 leading-relaxed">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            dapibus, nisl ultrices imperdiet vulputate, ligula erat tincidunt est, quis
            varius justo mi vel purus. Phasellus aliquam vulputate augue, sed
            lobortis elit dignissim nec. Integer porta a nisi ac imperdiet. Sed
            molestie diam diam, in elementum nisi volutpat quis. Suspendisse quis
            ipsum dui. Curabitur faucibus nisi lectus, sit amet
          </p>
          <p>
            Praesent sodales viverra leo et blandit. Vivamus pellentesque diam ac
            augue bibendum tristique. Duis tempor ante id nisi euismod, nec
            scelerisque felis vulputate. Aliquam ac gravida mauris, vel accumsan
            risus. Praesent semper ligula tortor, id sollicitudin mi ultricies id. Cras
            velit ipsum, malesuada nec leo at, placerat lacinia quam. Vestibulum
            vitae hendrerit urna. Suspendisse condimentum pulvinar sem
          </p>
          <p>
            Donec rutrum finibus magna. Morbi ac facilisis eros, ut ornare nisl. Orci
            varius natoque penatibus et magnis dis parturient montes, nascetur
            ridiculus mus. Nam volutpat erat id velit blandit iaculis.
          </p>
        </div>
      </div>
    </div>
  );
};
