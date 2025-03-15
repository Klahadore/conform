/**
 * Tailwind CSS Style Guide for Form Components
 * 
 * This guide provides Tailwind classes that match our custom CSS styling.
 * The LLM should use these class combinations when generating form HTML/JSX.
 * 
 * IMPORTANT GUIDELINES FOR LLM:
 * 1. All form fields should have a purple background theme with mint green accents
 * 2. Every field must include a manual override option
 * 3. Use consistent styling for all interactive elements
 * 4. Include proper accessibility attributes
 * 5. Follow the single-field-per-view pattern
 */

const TailwindStyleGuide = {
  // Container styles
  container: {
    base: "w-[90%] max-w-[700px] mx-auto mb-4 bg-purple-900/[0.08] rounded-xl overflow-hidden border border-purple-300/[0.15] transition-all duration-300",
    hover: "hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-400/10",
    field: "p-5 bg-purple-900/[0.08] rounded-xl border border-purple-300/[0.15] mb-4",
  },
  
  // Header styles
  header: {
    container: "flex justify-between items-center p-4 cursor-pointer transition-colors bg-purple-900/10 hover:bg-purple-900/15",
    title: "m-0 text-emerald-400 text-lg font-semibold",
    icon: "text-emerald-400 text-2xl font-light transition-transform duration-300 flex items-center justify-center w-6 h-6",
    iconExpanded: "rotate-180",
    fieldLabel: "text-white text-lg font-medium mb-2",
    required: "text-emerald-400 ml-1",
  },
  
  // Content area
  content: {
    container: "px-5 pb-5 border-t border-white/10",
    description: "text-white/70 text-sm mb-5 leading-relaxed",
    fieldDescription: "text-white/60 text-sm mb-4",
  },
  
  // Form inputs
  inputs: {
    // Common input properties
    common: {
      label: "block text-white mb-2 font-medium",
      container: "mb-5",
      error: "text-red-400 text-sm mt-1",
    },
    
    // Text input
    text: {
      container: "mb-5",
      input: "w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40 focus:shadow focus:shadow-emerald-400/10",
      placeholder: "placeholder:text-white/50",
    },
    
    // Textarea
    textarea: {
      container: "mb-5",
      input: "w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40 focus:shadow focus:shadow-emerald-400/10 min-h-[100px] resize-y",
      placeholder: "placeholder:text-white/50",
    },
    
    // Select/Dropdown
    select: {
      container: "mb-5 relative",
      button: "w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40 focus:shadow focus:shadow-emerald-400/10 flex justify-between items-center",
      icon: "text-emerald-400 ml-2",
      dropdown: "absolute z-10 w-full mt-1 bg-purple-900/90 border border-purple-300/20 rounded-lg shadow-lg max-h-[250px] overflow-y-auto",
      option: "p-3 hover:bg-purple-900/50 cursor-pointer text-white",
      selectedOption: "bg-emerald-400/10 border-l-2 border-emerald-400",
    },
    
    // Checkbox
    checkbox: {
      container: "mb-4",
      group: "space-y-2",
      item: "flex items-center",
      input: "w-5 h-5 rounded border-2 border-white/30 bg-white/5 text-emerald-400 focus:ring-emerald-400/30 focus:ring-offset-0 focus:ring-2 mr-3 transition-all",
      label: "text-white",
    },
    
    // Radio buttons
    radio: {
      container: "mb-4",
      group: "space-y-2",
      item: "flex items-center p-3 bg-purple-900/[0.08] rounded-lg cursor-pointer transition-all border border-purple-300/[0.15] mb-2 hover:bg-purple-900/[0.15]",
      itemSelected: "bg-emerald-400/10 border-emerald-400/40",
      button: {
        base: "w-[18px] h-[18px] rounded-full border-2 border-white/50 mr-3 flex items-center justify-center",
        selected: "border-emerald-400 after:content-[''] after:w-[10px] after:h-[10px] after:rounded-full after:bg-emerald-400",
      },
      label: "text-white text-[0.95rem]",
    },
    
    // Date picker
    date: {
      container: "mb-5",
      input: "w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40 focus:shadow focus:shadow-emerald-400/10",
      calendar: "bg-purple-900/90 border border-purple-300/20 rounded-lg shadow-lg p-3 mt-1",
      calendarHeader: "flex justify-between items-center mb-2",
      calendarNav: "text-emerald-400 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center",
      calendarDays: "grid grid-cols-7 gap-1",
      calendarDay: "w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80",
      calendarDaySelected: "bg-emerald-400/20 text-emerald-400",
      calendarDayDisabled: "text-white/30 cursor-not-allowed",
    },
    
    // Number input
    number: {
      container: "mb-5 flex",
      input: "w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40 focus:shadow focus:shadow-emerald-400/10",
      controls: "flex flex-col",
      button: "bg-white/10 hover:bg-white/20 text-white w-8 flex items-center justify-center",
      buttonUp: "rounded-tr-lg border-t border-r border-white/20",
      buttonDown: "rounded-br-lg border-b border-r border-white/20",
    },
    
    // File upload
    file: {
      container: "mb-5",
      dropzone: "border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-emerald-400/30 transition-all cursor-pointer bg-white/5",
      dropzoneActive: "border-emerald-400/50 bg-emerald-400/5",
      icon: "text-emerald-400 text-3xl mb-2",
      text: "text-white/70",
      input: "hidden",
      preview: "mt-3 p-2 bg-white/10 rounded-lg flex items-center justify-between",
      previewName: "text-white truncate",
      previewRemove: "text-red-400 hover:text-red-300 ml-2",
    },
    
    // Toggle/Switch
    toggle: {
      container: "mb-4 flex items-center",
      switch: "relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:ring-offset-2 focus:ring-offset-purple-900",
      switchActive: "bg-emerald-400/50",
      dot: "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
      dotActive: "translate-x-5",
      dotInactive: "translate-x-1",
      label: "ml-3 text-white",
    },
    
    // Range slider
    range: {
      container: "mb-5",
      input: "w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400",
      values: "flex justify-between text-white/70 text-sm mt-1",
    },
    
    // Options container (for dropdowns, radio lists, etc)
    options: {
      container: "flex flex-col gap-2 mb-6 max-h-[250px] overflow-y-auto",
      scrollbar: "scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-emerald-400/30 hover:scrollbar-thumb-emerald-400/50",
      
      // Regular option item (for dropdowns, etc)
      item: {
        base: "p-3 bg-purple-900/[0.08] rounded-lg cursor-pointer transition-all border border-purple-300/[0.15] hover:bg-purple-900/[0.15]",
        selected: "bg-emerald-400/10 border-emerald-400/40",
        label: "text-white text-[0.95rem]",
      },
    },
    
    // Placeholder for LLM-generated content
    placeholder: "p-3 bg-white/5 rounded-lg border border-dashed border-white/20 text-center text-white/50",
    
    // Manual override section (REQUIRED FOR ALL FIELDS)
    manualOverride: {
      container: "mt-4 pt-4 border-t border-white/10",
      header: "flex items-center justify-between mb-3",
      title: "text-white/80 text-sm font-medium",
      toggle: "text-emerald-400 text-sm underline cursor-pointer",
      input: "w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40",
    },
  },
  
  // Action buttons
  buttons: {
    container: "flex justify-end gap-3 mt-4",
    
    // Cancel button
    cancel: "py-[0.6rem] px-5 rounded-full font-semibold cursor-pointer transition-all text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20",
    
    // Apply/Submit button
    apply: "py-[0.6rem] px-5 rounded-full font-semibold cursor-pointer transition-all text-sm bg-emerald-400/20 text-emerald-400 border border-emerald-400/40 hover:bg-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed",
    
    // Close/X button
    close: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all",
  },
  
  // Navigation buttons for single-field display
  navigation: {
    container: "flex justify-between mt-6",
    button: "py-2 px-6 rounded-full font-semibold cursor-pointer transition-all text-sm bg-emerald-400/20 text-emerald-400 border border-emerald-400/40 hover:bg-emerald-400/30",
    buttonDisabled: "opacity-50 cursor-not-allowed",
    progress: "text-center text-white/70 text-sm mt-2",
  },
  
  // Form field wrapper (for single field display)
  fieldWrapper: "mb-6 animate-fadeIn",
  
  // Utility classes
  utils: {
    fadeIn: "animate-fadeIn",
    hidden: "hidden",
    divider: "border-t border-white/10 my-4",
    helpText: "text-white/60 text-xs italic mt-1",
  }
};

// Example usage for a text input field with manual override
/*
<div className={TailwindStyleGuide.container.field}>
  <label className={TailwindStyleGuide.header.fieldLabel}>
    Patient Name
    <span className={TailwindStyleGuide.header.required}>*</span>
  </label>
  
  <p className={TailwindStyleGuide.content.fieldDescription}>
    Enter the patient's full legal name as it appears on their ID.
  </p>
  
  <div className={TailwindStyleGuide.inputs.text.container}>
    <input
      type="text"
      className={`${TailwindStyleGuide.inputs.text.input} ${TailwindStyleGuide.inputs.text.placeholder}`}
      placeholder="e.g. John Smith"
    />
  </div>
  
  <div className={`${TailwindStyleGuide.inputs.options.container} ${TailwindStyleGuide.inputs.options.scrollbar}`}>
    <div 
      className={`${TailwindStyleGuide.inputs.options.item.base} ${selected === 'suggestion1' ? TailwindStyleGuide.inputs.options.item.selected : ''}`}
      onClick={() => setSelected('suggestion1')}
    >
      <span className={TailwindStyleGuide.inputs.options.item.label}>John A. Smith</span>
    </div>
    <div 
      className={`${TailwindStyleGuide.inputs.options.item.base} ${selected === 'suggestion2' ? TailwindStyleGuide.inputs.options.item.selected : ''}`}
      onClick={() => setSelected('suggestion2')}
    >
      <span className={TailwindStyleGuide.inputs.options.item.label}>Jonathan Smith</span>
    </div>
  </div>
  
  <div className={TailwindStyleGuide.inputs.manualOverride.container}>
    <div className={TailwindStyleGuide.inputs.manualOverride.header}>
      <span className={TailwindStyleGuide.inputs.manualOverride.title}>Manual Override</span>
      <span className={TailwindStyleGuide.inputs.manualOverride.toggle} onClick={() => setShowOverride(!showOverride)}>
        {showOverride ? 'Hide' : 'Show'}
      </span>
    </div>
    
    {showOverride && (
      <input
        type="text"
        className={TailwindStyleGuide.inputs.manualOverride.input}
        placeholder="Type your own value..."
      />
    )}
  </div>
  
  <div className={TailwindStyleGuide.navigation.container}>
    <button 
      className={`${TailwindStyleGuide.navigation.button} ${isFirstField ? TailwindStyleGuide.navigation.buttonDisabled : ''}`}
      disabled={isFirstField}
    >
      Previous
    </button>
    <button className={TailwindStyleGuide.navigation.button}>
      Next
    </button>
  </div>
  
  <div className={TailwindStyleGuide.navigation.progress}>
    Field 1 of 10
  </div>
</div>
*/

// Example usage for a radio button field with manual override
/*
<div className={TailwindStyleGuide.container.field}>
  <label className={TailwindStyleGuide.header.fieldLabel}>
    Gender
  </label>
  
  <p className={TailwindStyleGuide.content.fieldDescription}>
    Select the patient's gender as it appears on their medical records.
  </p>
  
  <div className={TailwindStyleGuide.inputs.radio.container}>
    <div className={TailwindStyleGuide.inputs.radio.group}>
      <div 
        className={`${TailwindStyleGuide.inputs.radio.item} ${selected === 'male' ? TailwindStyleGuide.inputs.radio.itemSelected : ''}`}
        onClick={() => setSelected('male')}
      >
        <div className={`${TailwindStyleGuide.inputs.radio.button.base} ${selected === 'male' ? TailwindStyleGuide.inputs.radio.button.selected : ''}`}></div>
        <span className={TailwindStyleGuide.inputs.radio.label}>Male</span>
      </div>
      
      <div 
        className={`${TailwindStyleGuide.inputs.radio.item} ${selected === 'female' ? TailwindStyleGuide.inputs.radio.itemSelected : ''}`}
        onClick={() => setSelected('female')}
      >
        <div className={`${TailwindStyleGuide.inputs.radio.button.base} ${selected === 'female' ? TailwindStyleGuide.inputs.radio.button.selected : ''}`}></div>
        <span className={TailwindStyleGuide.inputs.radio.label}>Female</span>
      </div>
      
      <div 
        className={`${TailwindStyleGuide.inputs.radio.item} ${selected === 'other' ? TailwindStyleGuide.inputs.radio.itemSelected : ''}`}
        onClick={() => setSelected('other')}
      >
        <div className={`${TailwindStyleGuide.inputs.radio.button.base} ${selected === 'other' ? TailwindStyleGuide.inputs.radio.button.selected : ''}`}></div>
        <span className={TailwindStyleGuide.inputs.radio.label}>Other</span>
      </div>
    </div>
  </div>
  
  <div className={TailwindStyleGuide.inputs.manualOverride.container}>
    <div className={TailwindStyleGuide.inputs.manualOverride.header}>
      <span className={TailwindStyleGuide.inputs.manualOverride.title}>Manual Override</span>
      <span className={TailwindStyleGuide.inputs.manualOverride.toggle} onClick={() => setShowOverride(!showOverride)}>
        {showOverride ? 'Hide' : 'Show'}
      </span>
    </div>
    
    {showOverride && (
      <input
        type="text"
        className={TailwindStyleGuide.inputs.manualOverride.input}
        placeholder="Specify gender..."
      />
    )}
  </div>
  
  <div className={TailwindStyleGuide.navigation.container}>
    <button className={TailwindStyleGuide.navigation.button}>
      Previous
    </button>
    <button className={TailwindStyleGuide.navigation.button}>
      Next
    </button>
  </div>
  
  <div className={TailwindStyleGuide.navigation.progress}>
    Field 3 of 10
  </div>
</div>
*/

export default TailwindStyleGuide; 