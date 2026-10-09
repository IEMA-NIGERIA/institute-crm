<template>
    <div class="md:h-screen">
        <!-- <nav class="h-[7%] flex items-center p-2 box-border border-solid border-1 border-gray-400">
            <div class="">
                <img src="/logo.png" alt="" class="w-30 h-10">
            </div>
        </nav> -->
        <div class="grid md:grid-cols-20 md:h-screen box-border">
            <div class="md:col-span-3 border-r-solid border-gray-500 border-1">
                <LayoutsSidebar />
            </div>
            <section class="min-w-0 md:overflow-hidden md:col-span-17 bg-gray-200">
                <LayoutsNavbar />
                <div class="md:h-[92%] md:overflow-scroll p-4 md:px-8">
                    <slot />
                </div>
            </section>
        </div>
    </div>
</template>